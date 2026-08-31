---
kind: generated-explanatory-visual
canonical_slot: appendix-B-03
anchor_id: null
chapter: null
appendix: B
visual_family: haros-technical-editorial-diagram
style_master: false
file: appendix-B-03.jpg
sha256: 3b41900d8f81c85f5b6c8681ec6932d9f9348999218fdd77860f92f7fcdb9304
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x1024
quality: high
format: jpeg
candidate_epoch: run-5-part-vii-appendices
candidate_count: 1
accepted_attempt: 1
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Schedule"
  - "Run"
  - "Result"
  - "Memory"
  - "Next run"
  - "Failure policy"
  - "Configured handling"
exact_text:
  - "Schedule"
  - "Run"
  - "Result"
  - "Memory"
  - "Next run"
  - "Failure policy"
  - "Configured handling"
relation_contract:
  - "Schedule leads to Run, Result, Memory, Next run, and back to Schedule. Run also passes through Failure policy and Configured handling before rejoining Result."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "An automation loop preserves schedule, result, memory, and configured failure handling."
extended_description: "Schedule leads to Run, Result, Memory, Next run, and back to Schedule. Run also passes through Failure policy and Configured handling before rejoining Result."
---

# appendix-B-03

Explanatory job: An automation loop preserves schedule, result, memory, and configured failure handling.

Reviewed sources: the owning chapter or appendix source anchors and the Run 5 pre-generation frozen text, edge, and forbidden-edge inventory.

Pre-generation prompt contract: warm-white, charcoal/gray, muted teal, and sparse amber technical editorial diagram; only the declared requested text and frozen relationships; no fake UI, people, rooms, physical toy metaphors, decorative unlabeled icons, or futuristic dashboard styling.

Final raster transcript contract: exact_text contains only full-resolution labels observed in the accepted raster; pre_generation_requested_text preserves the frozen prompt inventory even when deterministic cover composition adds canonical brand text.

Accessible equivalent: Schedule leads to Run, Result, Memory, Next run, and back to Schedule. Run also passes through Failure policy and Configured handling before rejoining Result.

Revision history: Run 5 used 1 rendered output for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
