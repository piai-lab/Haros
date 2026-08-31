---
kind: generated-explanatory-visual
canonical_slot: ch-04-secondary
anchor_id: null
chapter: 4
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-04-secondary.jpg
sha256: d3571e6fc218fde3087898628935cf457f5b155635cbf824dd9b6e35e78e62e3
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1670x921
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Before interruption"
  - "Interruption"
  - "Product settlement"
  - "After settlement"
  - "Product Thread"
  - "Prompt"
  - "Queue"
  - "Timeline"
  - "Native Session"
  - "Retained"
  - "Stops"
  - "Control restored"
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
  - "Interruption can stop the native Session without erasing Product Thread, prompt, Queue, or Timeline."
  - "Product control returns only after authoritative settlement."
alt_text: "A settlement timeline separates retained product facts from a stopped native Session."
extended_description: "Interruption can stop the native Session without erasing Product Thread, prompt, Queue, or Timeline. Product control returns only after authoritative settlement."
---

# Chapter 4 secondary figure

Explanatory job: show exactly what survives an interruption.

Reviewed source anchors: `docs/architecture.md#state-boundaries`;
`apps/server/src/orchestration/startupTurnReconciliation.ts`;
`apps/server/src/orchestration/turnLifecycle.ts`.

Accepted composition: a four-stage interruption timeline keeps Product Thread, Prompt, Queue, and
Timeline retained after settlement, stops Native Session, and shows Control restored only after
settlement. It contains no extra text or prohibited metaphor.

Generation provenance: built-in image generation at medium quality. Candidate accounting and the
accepted source provenance are recorded in front matter and the canonical Campaign spec; the
canonical raster passed full-resolution truth, text, style, and crop QA.

Accessible equivalent: Interruption can stop the native Session without erasing Product Thread,
prompt, Queue, or Timeline. Product control returns only after authoritative settlement.
