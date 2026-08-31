---
kind: generated-explanatory-visual
canonical_slot: ch-18-primary
anchor_id: G11
chapter: 18
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-18-primary.jpg
sha256: 57cb2358976541778445c37d2dbc16494a28209344f097a0593a96c6da8fa5d3
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1942x265
quality: built-in-default
format: jpeg
candidate_count: 4
generation_budget_status: PASS-WITH-ROOT-AUTHORIZED-ONE-TIME-WAIVER
exact_text:
  - "1 · Goal"
  - "2 · Plan"
  - "3 · Work"
  - "4 · Achieved"
relation_contract:
  - "A Goal can inform a Plan, which guides Work."
  - "Achievement is an explicit terminal record rather than an inference from ordinary Work."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A four-stage Goal lifecycle runs from Goal through Plan and Work to Achieved."
extended_description: "A Goal informs a Plan, and the Plan guides Work through the first three labelled states. Achieved is an explicit terminal achievement record rather than an inference from ordinary Work."
---

# ch-18-primary

Explanatory job: Teach the Goal pursuit sequence without collapsing Goal and Plan.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.ts`; `apps/server/src/orchestration/decider.goalTiming.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: A Goal informs a Plan, and the Plan guides Work through the first three labelled states. Achieved is an explicit terminal achievement record rather than an inference from ordinary Work.

Revision history: Candidates 1 and 2 failed natural-case review; candidate 3 corrected case but
lacked arrowheads and stopped at the normal 3/3 cap. The root authorized exactly one bounded +1
built-in imagegen waiver. Candidate 4 uses the exact natural-case labels and three explicit
left-to-right arrows, then passed full-resolution text, relationship, forbidden-family, and K-037 review.
