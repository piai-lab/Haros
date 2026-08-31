---
kind: generated-explanatory-visual
canonical_slot: ch-42-extra
anchor_id: null
chapter: 42
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-42-extra.jpg
sha256: 847b2a8934f420656c6cd7c2a1e1d51ceeed9b3ae58b1df4864a1ec41df47639
model: gpt-image-2
generation_tool: gpt-image-2
size: 1536x1024
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 1
accepted_attempt: 1
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Stream gap"
  - "Fresh snapshot"
  - "Merge"
  - "Visible state"
relation_contract:
  - "Stream gap points to Fresh snapshot, then Merge, then Visible state. The simple chain describes the client recovery intent; server admission may still return a resnapshot-required or stalled error when the newly captured gap remains outside its fixed bound."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A stream gap triggers a fresh snapshot, merges through the normal reducer, and restores visible state."
extended_description: "Stream gap points to Fresh snapshot, then Merge, then Visible state. The simple chain describes the client recovery intent; server admission may still return a resnapshot-required or stalled error when the newly captured gap remains outside its fixed bound."
---

# ch-42-extra

Explanatory job: A stream gap triggers a fresh snapshot, merges through the normal reducer, and restores visible state.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: Stream gap points to Fresh snapshot, then Merge, then Visible state. The simple chain describes the client recovery intent; server admission may still return a resnapshot-required or stalled error when the newly captured gap remains outside its fixed bound.

Revision history: Run 4 used 1 rendered output for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
