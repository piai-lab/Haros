---
kind: generated-explanatory-visual
canonical_slot: ch-15-secondary
anchor_id: null
chapter: 15
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-15-secondary.jpg
sha256: bb0445c0fb1a790023278d113a8923198873db0f075aa37b6904b6cc8f63c763
model: gpt-image-2
generation_tool: gpt-image-2
size: 1492x848
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Product projection"
  - "Admitted binding"
  - "First frame exposes binding"
  - "Runtime lifecycle"
  - "Runtime startup"
  - "Server truth"
  - "Reconcile projection"
  - "Server owns status"
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
  - "The admitted binding can be shown on the first frame while runtime startup continues."
  - "Server truth reconciles status."
alt_text: "Two lanes separate immediate product projection from runtime startup and later server reconciliation."
extended_description: "The admitted binding can be shown on the first frame while runtime startup continues. Server truth reconciles status."
---

# ch-15-secondary

Explanatory job: Show admitted binding before runtime startup, first-frame projection, and server reconciliation.

Reviewed source anchors:

- `packages/contracts/src/orchestration.ts#OrchestrationTurnProvenance`
- `apps/web/src/components/ChatView.tsx`
- `apps/server/src/orchestration/projector.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: The admitted binding can be shown on the first frame while runtime startup continues. Server truth reconciles status.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
