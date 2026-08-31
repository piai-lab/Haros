---
kind: generated-explanatory-visual
canonical_slot: ch-05-secondary
anchor_id: null
chapter: 5
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-05-secondary.jpg
sha256: aa0824107ec08be98e2430cca413ee3191121e428f2ef85d7856dd21a5ff4cb0
model: gpt-image-2
generation_tool: gpt-image-2
size: 1513x873
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Term A"
  - "Owner A"
  - "Relation"
  - "Term B"
  - "Owner B"
  - "Product Thread"
  - "Product orchestration"
  - "not equal"
  - "Native Session"
  - "Engine runtime"
  - "Engine"
  - "Engine descriptors"
  - "Model"
  - "Model service"
  - "Runtime mode"
  - "Turn admission"
  - "Interaction mode"
  - "Cognitive workflow"
  - "Project"
  - "Project contract"
  - "Workspace folder"
  - "Workspace owner"
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
  - "Product Thread is not native Session; Engine is not model; runtime mode is not interaction mode; Project is not merely its workspace folder."
alt_text: "A comparison matrix separates Product Thread from native Session, Engine from model, runtime mode from interaction mode, and Project from workspace folder."
extended_description: "Product Thread is not native Session; Engine is not model; runtime mode is not interaction mode; Project is not merely its workspace folder."
---

# Chapter 5 secondary figure

Explanatory job: make four high-cost vocabulary collisions visibly impossible.

Reviewed source anchors: `docs/architecture.md#engines`;
`packages/contracts/src/orchestration.ts#RuntimeMode`;
`packages/contracts/src/orchestration.ts#EngineInteractionMode`;
`packages/contracts/src/orchestration.ts#OrchestrationProject`.

Final prompt: four independent not-equal rows pair Product Thread/native Session, Engine/model,
runtime mode/interaction mode, and Project/workspace folder; no cross-row arrows or extra text.

Settings: `gpt-image-2`, medium, 1536×1024, JPEG quality 88. Candidate 1 passed full-resolution QA.

Accessible equivalent: Product Thread is not native Session; Engine is not model; runtime mode is
not interaction mode; Project is not merely its workspace folder.
