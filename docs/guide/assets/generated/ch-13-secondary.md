---
kind: generated-explanatory-visual
canonical_slot: ch-13-secondary
anchor_id: null
chapter: 13
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-13-secondary.jpg
sha256: aa068149c76a0faa122e5102b642f5c69ff452f6f0e0995e07ba471d0224d7e0
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1512x953
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Fact"
  - "Current dispatch effect"
  - "Boundary"
  - "Engine and model"
  - "Identity stays fixed"
  - "Same Engine"
  - "Current dispatch mode"
  - "Controls next dispatch"
  - "Workflow emphasis only"
  - "Older mode history"
  - "Cannot override"
  - "Current typed mode wins"
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
  - "Engine and model identity remains explicit."
  - "Current dispatch mode controls workflow emphasis; older mode history cannot override."
alt_text: "A fact matrix separates fixed Engine identity, current dispatch behavior, and older mode history."
extended_description: "Engine and model identity remains explicit. Current dispatch mode controls workflow emphasis; older mode history cannot override."
---

# ch-13-secondary

Explanatory job: Show current-dispatch mode controlling workflow while older mode history cannot override.

Reviewed source anchors:

- `apps/server/src/engine/interactionMode.ts`
- `packages/contracts/src/orchestration.ts#EngineInteractionMode`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Engine and model identity remains explicit. Current dispatch mode controls workflow emphasis; older mode history cannot override.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
