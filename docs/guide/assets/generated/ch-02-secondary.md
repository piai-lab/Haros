---
kind: generated-explanatory-visual
canonical_slot: ch-02-secondary
anchor_id: null
chapter: 2
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-02-secondary.jpg
sha256: a274bf0fa02bde84f0bfc43a012f196df5070123e933e9e2fdbe2f91c3b81883
model: gpt-image-2
generation_tool: gpt-image-2
size: 1491x695
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Product Thread"
  - "History"
  - "Recovery"
  - "Next-turn binding"
  - "Engine adapter"
  - "Engine"
  - "Model"
  - "Native Session"
  - "No Session transfer"
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
  - "Product history and recovery remain with the Product Thread."
  - "The adapter connects work to an Engine and model, but Haros does not transfer or fabricate the Engine's native Session."
alt_text: "Product Thread history and recovery remain separate from Engine, Model, and Native Session state."
extended_description: "Product history and recovery remain with the Product Thread. The adapter connects work to an Engine and model, but Haros does not transfer or fabricate the Engine's native Session."
---

# Chapter 2 secondary figure

Explanatory job: separate Product Thread continuity from native execution continuity.

Reviewed source anchors: `docs/architecture.md#engines`; `docs/architecture.md#state-boundaries`;
`packages/contracts/src/orchestration.ts#EngineSelection`.

Final prompt: `PRODUCT THREAD` contains `HISTORY` and `RECOVERY`; `ENGINE ADAPTER` mediates a
separate `ENGINE` containing `MODEL` and `NATIVE SESSION`; a blocked relation reads
`NO SESSION TRANSFER`; no arrow labels or extra text.

Settings: `gpt-image-2`, medium, 1536×1024, JPEG quality 88. Candidate 1 added unrequested arrow
labels; candidate 2 passed full-resolution QA.

Accessible equivalent: Product history and recovery remain with the Product Thread. The adapter
connects work to an Engine and model, but Haros does not transfer or fabricate the Engine's native
Session.
