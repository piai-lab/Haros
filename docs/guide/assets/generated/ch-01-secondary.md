---
kind: generated-explanatory-visual
canonical_slot: ch-01-secondary
anchor_id: null
chapter: 1
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-01-secondary.jpg
sha256: 25127a01bd347dde84e5858d0c05ab3559f01ec7e10c19f3824d3a65747aeb39
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1693x866
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Ask"
  - "Run"
  - "Review"
  - "Disruption boundary"
  - "Recover"
  - "One task"
  - "Context retained"
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
  - "One task moves from ask to run to review; after a disruption, recovery uses retained product context."
  - "The figure does not promise continuation of a native Engine Session."
alt_text: "Ask, Run, and Review precede a disruption boundary and Recover, while One task and Context retained span the journey."
extended_description: "One task moves from ask to run to review; after a disruption, recovery uses retained product context. The figure does not promise continuation of a native Engine Session."
---

# Chapter 1 secondary figure

Explanatory job: show one task retaining product context across execution and recovery.

Reviewed source anchors: `README.md#what-the-harness-os-owns`; `docs/architecture.md#engines`;
`docs/architecture.md#state-boundaries`.

Accepted composition: a rectangle-only Ask → Run → Review sequence crosses a labeled Disruption
boundary before Recover; a lower band keeps One task and Context retained visible. It contains no
fake terminal, pictograms, physical metaphor, or extra text.

Generation provenance: built-in image generation at medium quality. Candidate accounting and the
accepted source path are recorded in front matter; the canonical raster passed full-resolution
truth, text, style, and crop QA.

Accessible equivalent: One task moves from ask to run to review; after a disruption, recovery uses
retained product context. The figure does not promise continuation of a native Engine Session.
