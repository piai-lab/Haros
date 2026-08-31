---
kind: generated-explanatory-visual
canonical_slot: ch-06-extra-01
anchor_id: null
chapter: 6
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-06-extra-01.jpg
sha256: ced8b9d06ea1c5af4b041ebe53586a3acd1176e73002d305fe3de6dd8279a9b3
model: gpt-image-2
generation_tool: gpt-image-2
size: 1511x945
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Request"
  - "External outcome"
  - "Product response"
  - "Next control"
  - "Request sent"
  - "Outward call fails"
  - "Visible failure"
  - "Control returns"
  - "User choice"
  - "Explicit retry"
  - "Product Thread"
  - "Local state remains"
  - "No silent fallback"
acceptance_exact_text: PASS-full-resolution-executor-audit
acceptance_relationships: PASS-executor-source-review
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
relation_contract:
  - "When an outward request fails, Haros reports failure and returns control."
  - "Local state remains, and the product does not silently substitute another service."
alt_text: "A four-column failure matrix separates external failure, product response, and user-owned retry."
extended_description: "When an outward request fails, Haros reports failure and returns control. Local state remains, and the product does not silently substitute another service."
---

# Chapter 6 failure and boundary figure

Explanatory job: show that an outward failure is explicit and does not erase local product work.

Reviewed source anchors: `README.md#what-the-harness-os-owns`; `docs/architecture.md#engines`;
`docs/architecture.md#state-boundaries`.

Final prompt: strict `REQUEST SENT → OUTWARD CALL FAILS → CONTROL RETURNS`; lower durable band
`LOCAL STATE REMAINS`; blocked branch `NO SILENT FALLBACK`; rectangles and arrows only.

Settings: `gpt-image-2`, medium, 1536×1024, JPEG quality 88. Candidate 1 added many invented labels
and UI-like cards; candidate 2 passed full-resolution QA.

Accessible equivalent: When an outward request fails, Haros reports failure and returns control.
Local state remains, and the product does not silently substitute another service.
