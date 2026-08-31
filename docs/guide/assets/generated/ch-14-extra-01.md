---
kind: generated-explanatory-visual
canonical_slot: ch-14-extra-01
anchor_id: null
chapter: 14
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-14-extra-01.jpg
sha256: e1411a985ad30465577822d5b055d130dfd17af44f6926d86a73d43880654701
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x996
quality: medium
format: jpeg
candidate_count: 8
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Condition"
  - "Runtime handling"
  - "Product settlement"
  - "No active session"
  - "Settle locally"
  - "Terminal: Interrupted"
  - "Main Session"
  - "Confirmed stop"
  - "Terminal: Interrupted"
  - "Child Session"
  - "Await terminal event"
  - "Terminal event settles Turn"
  - "Timeout / uncertain"
  - "Stop Session"
  - "Settlement after outcome"
  - "Rejected"
  - "Failure + local settlement"
  - "Terminal: Interrupted"
  - "Product Thread retained"
  - "Native Session not promised"
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
  - "No active session maps to Settle locally and then Terminal: Interrupted."
  - "Main Session maps to Confirmed stop and then Terminal: Interrupted."
  - "Child Session maps to Await terminal event and then Terminal event settles Turn."
  - "Timeout / uncertain maps to Stop Session and then Settlement after outcome."
  - "Rejected maps to Failure + local settlement and then Terminal: Interrupted."
  - "Product Thread is retained, while Native Session continuation is not promised."
alt_text: "A five-row matrix with columns Condition, Runtime handling, and Product settlement maps No active session to Settle locally to Terminal: Interrupted; Main Session to Confirmed stop to Terminal: Interrupted; Child Session to Await terminal event to Terminal event settles Turn; Timeout / uncertain to Stop Session to Settlement after outcome; and Rejected to Failure + local settlement to Terminal: Interrupted. A bottom band states Product Thread retained and Native Session not promised."
extended_description: "The matrix columns are Condition, Runtime handling, and Product settlement. No active session → Settle locally → Terminal: Interrupted. Main Session → Confirmed stop → Terminal: Interrupted. Child Session → Await terminal event → Terminal event settles Turn. Timeout / uncertain → Stop Session → Settlement after outcome. Rejected → Failure + local settlement → Terminal: Interrupted. Product Thread retained. Native Session not promised."
---

# Chapter 14 interrupt boundary figure

Explanatory job: map each interrupt condition to its bounded runtime handling and Product settlement
without claiming one universal Engine acknowledgment.

Reviewed sources: `EngineCommandReactor.ts`, lines 3804–3905;
`decider.ts#thread.turn.interrupt`; `turnLifecycle.ts`; `docs/architecture.md#Engines`.

Final correction history: fan-in diagrams repeatedly obscured which runtime result caused which
Product settlement, so the accepted replacement uses a three-column matrix. Its five independent
rows cover no active session, confirmed main-session stop, child terminal-event settlement,
timeout/uncertain session stop, and rejected failure plus local settlement. Each row contains only
two left-to-right arrows, with no shared rail or cross-row implication. Evidence:
`apps/server/src/orchestration/Layers/EngineCommandReactor.ts`, lines 3804–3905.

Accessible equivalent: The matrix columns are Condition, Runtime handling, and Product settlement.
No active session → Settle locally → Terminal: Interrupted. Main Session → Confirmed stop → Terminal:
Interrupted. Child Session → Await terminal event → Terminal event settles Turn. Timeout / uncertain
→ Stop Session → Settlement after outcome. Rejected → Failure + local settlement → Terminal:
Interrupted. Product Thread retained. Native Session not promised.
