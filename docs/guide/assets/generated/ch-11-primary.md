---
kind: generated-explanatory-visual
canonical_slot: ch-11-primary
anchor_id: null
chapter: 11
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-11-primary.jpg
sha256: a8f362a321995dff7be2027408f63282fa1237ea7da069128c6b13a06c80eb9d
model: gpt-image-2
generation_tool: gpt-image-2
size: 1512x897
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Engine runtime"
  - "Complete agent execution"
  - "Model service domain"
  - "Upstream model catalog"
  - "Exact model identity"
  - "Model slug"
  - "Selection binds exact values"
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
  - "Engine runtime is complete agent execution; model-service domain supplies an upstream catalog; exact model identity uses a model slug."
alt_text: "Three adjacent columns separate Engine runtime, model-service domain, and exact model identity."
extended_description: "Engine runtime is complete agent execution; model-service domain supplies an upstream catalog; exact model identity uses a model slug."
---

# ch-11-primary

Explanatory job: Show Engine runtime, model-service domain, exact-model identity, and binding without false ownership nesting.

Reviewed source anchors:

- `packages/shared/src/engineMetadata.ts`
- `packages/contracts/src/orchestration.ts#EngineSelection`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Engine runtime is complete agent execution; model-service domain supplies an upstream catalog; exact model identity uses a model slug.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
