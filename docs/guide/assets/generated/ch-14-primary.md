---
kind: generated-explanatory-visual
canonical_slot: ch-14-primary
anchor_id: G09
chapter: 14
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-14-primary.jpg
sha256: 9e584f8e28ffce066f9503b06b7a3bd727d82182a10f4100ca833cc89943d680
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1452x973
quality: medium
format: jpeg
candidate_count: 5
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Turn start"
  - "Active Turn?"
  - "No · Start request"
  - "Yes · Queue"
  - "Pending"
  - "Running"
  - "Terminal: Completed · Interrupted · Error"
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
  - "A turn start branches on whether a turn is active."
  - "No active turn produces a start request; an active turn queues."
  - "Both admitted paths project pending, then running, then one of completed, interrupted, or error."
alt_text: "A conditional turn-start diagram separates idle start from active-turn Queue before pending, running, and terminal states."
extended_description: "A turn start branches on whether a turn is active. No active turn produces a start request; an active turn queues. Both admitted paths project pending, then running, then one of completed, interrupted, or error."
---

# Chapter 14 primary figure

Explanatory job: separate conditional admission from the projected turn lifecycle.

Reviewed sources: isolated production queue fixture; `packages/contracts/src/orchestration.ts`;
`apps/server/src/orchestration/decider.ts`; `apps/server/src/orchestration/turnLifecycle.ts`.

Final correction history: the rejected universal five-station rail was retired. Controlled edits
removed extra labels and made both the idle start-request path and active-turn queue path converge
on `PENDING`; only then does projection advance to `RUNNING` and a truthful terminal state.

Accessible equivalent: A turn start branches on whether a turn is active. No active turn produces a
start request; an active turn queues. Both admitted paths project pending, then running, then one of
completed, interrupted, or error.
