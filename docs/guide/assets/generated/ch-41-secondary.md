---
kind: generated-explanatory-visual
canonical_slot: ch-41-secondary
anchor_id: null
chapter: 41
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-41-secondary.jpg
sha256: 546bcde9be4ac8a8e7618ecd3dece1d15d7939540839738aff4ac3b9ec53e228
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x855
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Session lease"
  - "Exact turn"
  - "In-flight request"
  - "Retire authority"
  - "Cancel drain"
  - "Receipt"
relation_contract:
  - "Session lease contains Exact turn and In-flight request. Exact turn points down to the in-flight request and right to Retire authority. The safety sequence then continues through Cancel drain to Receipt. Authority retirement therefore precedes the drain."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "An exact Turn inside a Session lease identifies its in-flight request and retires authority before cancellation drains and returns a receipt."
extended_description: "Session lease contains Exact turn and In-flight request. Exact turn points down to the in-flight request and right to Retire authority. The safety sequence then continues through Cancel drain to Receipt. Authority retirement therefore precedes the drain."
---

# ch-41-secondary

Explanatory job: An exact Turn inside a Session lease identifies its in-flight request and retires authority before cancellation drains and returns a receipt.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: Session lease contains Exact turn and In-flight request. Exact turn points down to the in-flight request and right to Retire authority. The safety sequence then continues through Cancel drain to Receipt. Authority retirement therefore precedes the drain.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
