---
kind: generated-explanatory-visual
canonical_slot: ch-44-primary
anchor_id: null
chapter: 44
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-44-primary.jpg
sha256: c52916690dad19e40893ef7ce5e986268d466c3f55fada25e683a5cb91ae3242
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1450x881
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Failure boundaries"
  - "Invalid input"
  - "Typed refusal"
  - "Timed out"
  - "Receipt lookup"
  - "Known result"
  - "Uncertain"
  - "Accepted Turn"
  - "Cancelled"
  - "Runtime failed"
  - "Terminal settlement"
exact_text:
  - "Invalid input"
  - "Typed refusal"
  - "Timed out"
  - "Receipt lookup"
  - "Known result"
  - "Uncertain"
  - "Accepted Turn"
  - "Cancelled"
  - "Runtime failed"
  - "Terminal settlement"
relation_contract:
  - "Invalid input points to Typed refusal. Timed out points to Receipt lookup, which branches to Known result and Uncertain. Separately, Accepted Turn branches to Cancelled and Runtime failed; both outcomes then point to Terminal settlement. Invalid input and timeout therefore do not bypass their own evidence paths."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Failure handling separates typed refusal, uncertain timeout lookup, and terminal settlement after an accepted Turn."
extended_description: "Invalid input points to Typed refusal. Timed out points to Receipt lookup, which branches to Known result and Uncertain. Separately, Accepted Turn branches to Cancelled and Runtime failed; both outcomes then point to Terminal settlement. Invalid input and timeout therefore do not bypass their own evidence paths."
---

# ch-44-primary

Explanatory job: Failure handling separates typed refusal, uncertain timeout lookup, and terminal settlement after an accepted Turn.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: Invalid input points to Typed refusal. Timed out points to Receipt lookup, which branches to Known result and Uncertain. Separately, Accepted Turn branches to Cancelled and Runtime failed; both outcomes then point to Terminal settlement. Invalid input and timeout therefore do not bypass their own evidence paths.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
