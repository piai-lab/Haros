---
kind: generated-explanatory-visual
canonical_slot: ch-07-extra-01
anchor_id: null
chapter: 7
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-07-extra-01.jpg
sha256: 51305d0ba14776ada056a36c081a08e148170e948659b1f0f473d0e119688b6d
model: gpt-image-2
generation_tool: gpt-image-2
size: 1536x951
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Condition"
  - "Honest status"
  - "Next action"
  - "Not installed"
  - "Unavailable"
  - "Install Engine"
  - "Authentication required"
  - "Unavailable"
  - "Authenticate Engine"
  - "Degraded"
  - "Degraded"
  - "Diagnose health"
  - "Catalog unknown"
  - "Unknown"
  - "Retry discovery"
  - "Ready"
  - "Ready"
  - "Use exact binding"
  - "No silent substitute"
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
  - "Not installed, authentication required, degraded, catalog unknown, and ready remain separate states."
  - "No non-ready state permits silent Engine or model substitution."
alt_text: "A setup status matrix keeps Not installed, Authentication required, Degraded, Catalog unknown, and Ready distinct and forbids silent Engine or model substitution."
extended_description: "Not installed, authentication required, degraded, catalog unknown, and ready remain separate states. No non-ready state permits silent Engine or model substitution."
---

# ch-07-extra-01

Explanatory job: Map five readiness conditions to honest status and exact next action with no substitution.

Reviewed source anchors:

- `apps/web/src/components/onboarding/firstRunReadiness.logic.ts`
- `apps/server/src/engine/executionCapabilityProjection.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Not installed, authentication required, degraded, catalog unknown, and ready remain separate states. No non-ready state permits silent Engine or model substitution.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
