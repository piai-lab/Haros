---
kind: generated-explanatory-visual
canonical_slot: ch-10-secondary
anchor_id: null
chapter: 10
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-10-secondary.jpg
sha256: 50d00ab15fbd70e9705f383706f35f6303a73d14f6cc9f48ced53c597089eaef
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1690x931
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Check"
  - "Passing evidence"
  - "If check fails"
  - "Exact binding"
  - "Explicit and currently usable"
  - "Refuse · Draft retained"
  - "Required capability"
  - "Available for the exact request"
  - "Current product state"
  - "Admission allowed now"
  - "All checks pass"
  - "Accept admitted work"
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
  - "A draft proceeds through exact binding, capability, and current state checks."
  - "Acceptance creates admitted work; refusal leaves the draft retained."
alt_text: "A condition matrix shows three independent admission checks and the only acceptance summary."
extended_description: "A draft proceeds through exact binding, capability, and current state checks. Acceptance creates admitted work; refusal leaves the draft retained."
---

# ch-10-secondary

Explanatory job: Show exact send-admission gates and draft retention on refusal.

Reviewed source anchors:

- `apps/web/src/components/ChatView.tsx`
- `apps/server/src/orchestration/decider.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: A draft proceeds through exact binding, capability, and current state checks. Acceptance creates admitted work; refusal leaves the draft retained.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
