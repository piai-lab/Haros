---
kind: generated-explanatory-visual
canonical_slot: ch-45-secondary
anchor_id: null
chapter: 45
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-45-secondary.jpg
sha256: f7585517d4e4e11ec9e935a8e2220c0effb59382058012903c62a0f796628d0f
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1504x473
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 2
accepted_attempt: 2
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Startup reconciliation"
  - "Server restart"
  - "Orphaned turn"
  - "Turn interrupted"
  - "Stale interaction"
  - "Interaction stale"
  - "Composer ready"
exact_text:
  - "Server restart"
  - "Orphaned turn"
  - "Turn interrupted"
  - "Stale interaction"
  - "Interaction stale"
  - "Composer ready"
relation_contract:
  - "Server restart branches to Orphaned turn and Stale interaction. The Turn branch continues to Turn interrupted; the interaction branch continues to Interaction stale. Both paths then point to Composer ready. A stale interaction does not flow through Turn interrupted."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Startup reconciliation separates an orphaned Turn from a stale interaction before both paths restore a usable composer."
extended_description: "Server restart branches to Orphaned turn and Stale interaction. The Turn branch continues to Turn interrupted; the interaction branch continues to Interaction stale. Both paths then point to Composer ready. A stale interaction does not flow through Turn interrupted."
---

# ch-45-secondary

Explanatory job: Startup reconciliation separates an orphaned Turn from a stale interaction before both paths restore a usable composer.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: Server restart branches to Orphaned turn and Stale interaction. The Turn branch continues to Turn interrupted; the interaction branch continues to Interaction stale. Both paths then point to Composer ready. A stale interaction does not flow through Turn interrupted.

Revision history: Run 4 used 2 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
