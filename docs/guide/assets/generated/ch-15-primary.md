---
kind: generated-explanatory-visual
canonical_slot: ch-15-primary
anchor_id: G10
chapter: 15
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-15-primary.jpg
sha256: d7e16356ee42371e94c2a60243db3e51e7d2b00b8428c8d1a2e7f941694219c3
model: gpt-image-2
generation_tool: gpt-image-2
size: 1453x896
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Question"
  - "Source field and owner"
  - "Timeline projection"
  - "What"
  - "Activity kind and summary"
  - "Visible activity"
  - "When"
  - "Sequence and created at"
  - "Ordered entry"
  - "Which Engine"
  - "Engine selection"
  - "Engine identity"
  - "Which model"
  - "Exact model"
  - "Model identity"
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
  - "Timeline evidence answers what, when, which Engine, and which model."
alt_text: "A four-row Timeline provenance matrix answers what happened, when, which Engine ran, and which model was admitted."
extended_description: "Timeline evidence answers what, when, which Engine, and which model."
---

# ch-15-primary

Explanatory job: Map four provenance questions to exact source fields/owners and Timeline projection.

Reviewed source anchors:

- `packages/contracts/src/orchestration.ts#OrchestrationThreadActivity`
- `packages/contracts/src/orchestration.ts#OrchestrationTurnProvenance`
- `apps/web/src/workLog.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Timeline evidence answers what, when, which Engine, and which model.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
