---
kind: generated-explanatory-visual
canonical_slot: ch-43-secondary
anchor_id: null
chapter: 43
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-43-secondary.jpg
sha256: 8c135328898baadeb4bc33769c27123ef47659824baf460a8792a8a69453aeb4
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x1024
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 2
accepted_attempt: 2
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Admission lanes"
  - "Control request"
  - "Control reserve"
  - "New work"
  - "User lane"
  - "Background lane"
  - "Capacity check"
  - "Accepted"
  - "Overloaded"
exact_text:
  - "Control request"
  - "Control reserve"
  - "New work"
  - "User lane"
  - "Background lane"
  - "Capacity check"
  - "Accepted"
  - "Overloaded"
relation_contract:
  - "Control request points to Control reserve and then directly to Accepted, bypassing the ordinary check. New work branches to User lane and Background lane; both enter Capacity check, which branches to Accepted or Overloaded. Here Background lane is the source's normal queue, described by its background-work responsibility."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Control commands use reserved capacity while user and background Product commands pass the ordinary capacity check."
extended_description: "Control request points to Control reserve and then directly to Accepted, bypassing the ordinary check. New work branches to User lane and Background lane; both enter Capacity check, which branches to Accepted or Overloaded. Here Background lane is the source's normal queue, described by its background-work responsibility."
---

# ch-43-secondary

Explanatory job: Control commands use reserved capacity while user and background Product commands pass the ordinary capacity check.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: Control request points to Control reserve and then directly to Accepted, bypassing the ordinary check. New work branches to User lane and Background lane; both enter Capacity check, which branches to Accepted or Overloaded. Here Background lane is the source's normal queue, described by its background-work responsibility.

Revision history: Run 4 used 2 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
