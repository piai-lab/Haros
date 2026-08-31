---
kind: generated-explanatory-visual
canonical_slot: ch-07-primary
anchor_id: G07
chapter: 7
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-07-primary.jpg
sha256: 61032ee18e69f70c573372ef8a128bb93b9271b3f1841521b3d438c196699112
model: gpt-image-2
generation_tool: gpt-image-2
size: 1514x587
quality: medium
format: jpeg
candidate_count: 3
generation_budget_status: EXHAUSTED
exact_text:
  - "Engine"
  - "Complete runtime"
  - "Model service"
  - "Upstream model domain"
  - "Exact model"
  - "Admitted model identity"
  - "Ready"
  - "Currently sendable"
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
  - "ENGINE is the complete runtime."
  - "MODEL SERVICE is the upstream model domain."
  - "EXACT MODEL is the admitted identity."
  - "READY means currently sendable."
alt_text: "Four adjacent setup layers separate Engine, model service, exact model, and readiness."
extended_description: "ENGINE is the complete runtime. MODEL SERVICE is the upstream model domain. EXACT MODEL is the admitted identity. READY means currently sendable."
---

# ch-07-primary

Explanatory job: Separate complete Engine runtime, model-service domain, exact model identity, and current readiness.

Reviewed source anchors:

- `packages/shared/src/engineMetadata.ts#ENGINE_DESCRIPTORS`
- `apps/web/src/components/onboarding/firstRunReadiness.logic.ts`
- `apps/server/src/engine/executionCapabilityProjection.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: ENGINE is the complete runtime. MODEL SERVICE is the upstream model domain. EXACT MODEL is the admitted identity. READY means currently sendable.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
