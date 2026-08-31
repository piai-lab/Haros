---
kind: generated-explanatory-visual
canonical_slot: ch-12-secondary
anchor_id: null
chapter: 12
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-12-secondary.jpg
sha256: 5b926e612c3f281cbf140539af762a2589512c0e945d16402c940fd1a8f2ca78
model: gpt-image-2
generation_tool: gpt-image-2
size: 1503x944
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Approval required"
  - "User decision when required"
  - "Auto"
  - "Capability-gated automation"
  - "Full access"
  - "Broadest supported policy"
  - "HostGateway capability authority"
  - "Authority stays with HostGateway"
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
  - "Approval-required, auto, and full-access are policy modes."
  - "All remain under one HostGateway capability authority."
alt_text: "Three runtime policies feed one HostGateway capability authority."
extended_description: "Approval-required, auto, and full-access are policy modes. All remain under one HostGateway capability authority."
---

# ch-12-secondary

Explanatory job: Show three runtime policies feeding one HostGateway authority.

Reviewed source anchors:

- `packages/contracts/src/orchestration.ts#RuntimeMode`
- `apps/server/src/engine/executionCapabilityProjection.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Approval-required, auto, and full-access are policy modes. All remain under one HostGateway capability authority.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
