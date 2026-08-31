---
kind: generated-explanatory-visual
canonical_slot: ch-38-primary
anchor_id: null
chapter: 38
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-38-primary.jpg
sha256: ecb6a368df92881bea95fb6b9c7370d7a6bb1a9b64aa34d1d98e45819ee47ef4
model: gpt-image-2
generation_tool: gpt-image-2
size: 1536x1024
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 2
accepted_attempt: 2
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Event store"
  - "Bounded replay"
  - "Projection pipeline"
  - "Read models"
  - "Capture high-water N"
  - "Projection cursor"
  - "Verify at N"
relation_contract:
  - "Event store flows to Bounded replay, then to Projection pipeline and Read models. Capture high-water N points both to Bounded replay and to Verify at N. Projection pipeline also advances Projection cursor, which points to the same Verify at N check. The shared N makes the replay finite and verifies progress against durable order."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A captured high-water sequence bounds event replay while the projection pipeline advances read models and verifies its cursor at that same fence."
extended_description: "Event store flows to Bounded replay, then to Projection pipeline and Read models. Capture high-water N points both to Bounded replay and to Verify at N. Projection pipeline also advances Projection cursor, which points to the same Verify at N check. The shared N makes the replay finite and verifies progress against durable order."
---

# ch-38-primary

Explanatory job: A captured high-water sequence bounds event replay while the projection pipeline advances read models and verifies its cursor at that same fence.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: Event store flows to Bounded replay, then to Projection pipeline and Read models. Capture high-water N points both to Bounded replay and to Verify at N. Projection pipeline also advances Projection cursor, which points to the same Verify at N check. The shared N makes the replay finite and verifies progress against durable order.

Revision history: Run 4 used 2 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
