---
kind: generated-explanatory-visual
canonical_slot: ch-10-primary
anchor_id: null
chapter: 10
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-10-primary.jpg
sha256: ae2f2f72df9ced01562f3684100e73953b6a0664db11a8a750d9c7ede2ccc586
model: gpt-image-2
generation_tool: gpt-image-2
size: 1495x650
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Prompt and references"
  - "Engine and model"
  - "Runtime mode"
  - "Interaction mode"
  - "Dispatch intent"
  - "Validate"
  - "Admit"
  - "Refuse"
  - "Draft retained"
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
  - "Prompt and references, exact binding, runtime mode, interaction mode, and dispatch intent feed validation."
  - "Validation admits or refuses; refusal retains the draft."
alt_text: "A control matrix separates Composer inputs, validation, admission, refusal, and retained draft."
extended_description: "Prompt and references, exact binding, runtime mode, interaction mode, and dispatch intent feed validation. Validation admits or refuses; refusal retains the draft."
---

# ch-10-primary

Explanatory job: Decompose Composer request formation and the validation branch to admit or refuse while retaining draft.

Reviewed source anchors:

- `apps/web/src/components/ChatView.tsx`
- `packages/contracts/src/orchestration.ts`
- `apps/server/src/orchestration/decider.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Prompt and references, exact binding, runtime mode, interaction mode, and dispatch intent feed validation. Validation admits or refuses; refusal retains the draft.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
