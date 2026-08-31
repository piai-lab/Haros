---
kind: generated-explanatory-visual
canonical_slot: ch-19-primary
anchor_id: null
chapter: 19
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-19-primary.jpg
sha256: b45ea38c8fffcff33caed6281427556a98aba6ace9994a95e76740f606193914
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1721x418
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Proposed Plan"
  - "Review"
  - "Implement"
  - "Implementation Thread"
  - "Source plan link"
relation_contract:
  - "A Proposed Plan is reviewed before implementation begins."
  - "Implementation uses a distinct Thread linked to the source plan."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A reviewed Proposed Plan leads to a distinct Implementation Thread with a source-plan link."
extended_description: "The main path is Proposed Plan, Review, Implement, Implementation Thread. A dashed Source plan link binds the new Thread to the reviewed plan without merging histories."
---

# ch-19-primary

Explanatory job: Explain the plan-to-implementation bridge.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/web/src/components/chat/ProposedPlanActions.tsx`; `apps/server/src/persistence/Layers/ProjectionThreadProposedPlans.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The main path is Proposed Plan, Review, Implement, Implementation Thread. A dashed Source plan link binds the new Thread to the reviewed plan without merging histories.

Revision history: Run 3 used two built-in imagegen outputs. Full-resolution review rejected the
first for unlabeled endpoint dots. Candidate 2 retains the labelled Source plan link without dots
and passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
