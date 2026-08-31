---
kind: generated-explanatory-visual
canonical_slot: ch-11-secondary
anchor_id: null
chapter: 11
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-11-secondary.jpg
sha256: 8f9fa8291ac97139244a1649c9cc658836e148b3ea3cd0655fa55d5a0000c78e
model: gpt-image-2
generation_tool: gpt-image-2
size: 1473x718
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Engine"
  - "Model"
  - "Options"
  - "Requested at"
  - "Record selection provenance"
  - "Admission freezes binding"
  - "Admitted Turn"
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
  - "Engine, model, options, and requested time belong to the provenance record for the admitted turn."
alt_text: "A provenance record freezes Engine, model, options, and requested time for an admitted Turn."
extended_description: "Engine, model, options, and requested time belong to the provenance record for the admitted turn."
---

# ch-11-secondary

Explanatory job: Record requested Engine/model/options/time and freeze admitted selection provenance.

Reviewed source anchors:

- `packages/contracts/src/orchestration.ts#OrchestrationTurnProvenance`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Engine, model, options, and requested time belong to the provenance record for the admitted turn.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
