---
kind: generated-explanatory-visual
canonical_slot: ch-09-secondary
anchor_id: null
chapter: 9
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-09-secondary.jpg
sha256: 70b117670c419dbe070c59f6e2f5310ca72bc01fb4b2ed9d846d8a0c38c78a10
model: gpt-image-2
generation_tool: gpt-image-2
size: 1492x965
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Product history"
  - "Native Engine state"
  - "Owner"
  - "Haros Orchestration"
  - "Selected Engine"
  - "Contains"
  - "Messages, activities, Turn provenance"
  - "Private Session state"
  - "Lifecycle"
  - "Durable Product Thread"
  - "Engine-scoped runtime"
  - "Cross-Engine rule"
  - "History retained"
  - "Continuation not promised"
  - "Not copied"
  - "Not the same lifecycle"
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
  - "Haros owns Messages, Activities, and Turn provenance."
  - "The selected Engine owns private Session state."
  - "These facts are not copied, do not share one lifecycle, and do not promise continuation."
alt_text: "A two-column boundary matrix separates product history from native Engine state."
extended_description: "Haros owns Messages, Activities, and Turn provenance. The selected Engine owns private Session state. These facts are not copied, do not share one lifecycle, and do not promise continuation."
---

# ch-09-secondary

Explanatory job: Contrast Haros product history with selected-Engine private state and three non-equivalence invariants.

Reviewed source anchors:

- `packages/contracts/src/orchestration.ts#OrchestrationThread`
- `docs/architecture.md#state-boundaries`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Haros owns Messages, Activities, and Turn provenance. The selected Engine owns private Session state. These facts are not copied, do not share one lifecycle, and do not promise continuation.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
