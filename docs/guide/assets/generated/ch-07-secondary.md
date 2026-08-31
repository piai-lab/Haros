---
kind: generated-explanatory-visual
canonical_slot: ch-07-secondary
anchor_id: null
chapter: 7
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-07-secondary.jpg
sha256: e8e3b90766607927aaebe305e31e5a69fc35d72de87d22cfa1affe731463a871
model: gpt-image-2
generation_tool: gpt-image-2
size: 1516x816
quality: medium
format: jpeg
candidate_count: 3
generation_budget_status: EXHAUSTED
exact_text:
  - "Condition"
  - "Current fact"
  - "Recovery action"
  - "Re-check"
  - "Engine unavailable"
  - "Installation or authentication failed"
  - "Repair Engine"
  - "Discover Engine"
  - "Model catalog unavailable"
  - "Service or catalog unresolved"
  - "Repair model service"
  - "Discover catalog"
  - "Exact binding unavailable"
  - "No sendable model selected"
  - "Choose exact binding"
  - "Check readiness"
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
  - "An unavailable Engine maps to Repair Engine and then Discover Engine; an unavailable model catalog maps to Repair model service and then Discover catalog; an unavailable exact binding maps to Choose exact binding and then Check readiness."
  - "Each recovery stays in its own row and returns through the owner-specific re-check."
alt_text: "A row-local recovery matrix maps unavailable Engine, model catalog, and exact binding to explicit re-checks."
extended_description: "An unavailable Engine maps to Repair Engine and then Discover Engine; an unavailable model catalog maps to Repair model service and then Discover catalog; an unavailable exact binding maps to Choose exact binding and then Check readiness. Each recovery stays in its own row and returns through the owner-specific re-check."
---

# ch-07-secondary

Explanatory job: Show degraded setup and per-owner recovery without a false sequential recovery order.

Reviewed source anchors:

- `apps/web/src/components/onboarding/firstRunReadiness.logic.ts`
- `apps/web/src/components/onboarding/useFirstRunReadinessController.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: An unavailable Engine maps to Repair Engine and then Discover Engine; an unavailable model catalog maps to Repair model service and then Discover catalog; an unavailable exact binding maps to Choose exact binding and then Check readiness. Each recovery stays in its own row and returns through the owner-specific re-check.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
