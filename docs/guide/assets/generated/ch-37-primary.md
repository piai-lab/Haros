---
kind: generated-explanatory-visual
canonical_slot: ch-37-primary
anchor_id: G18
chapter: 37
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-37-primary.jpg
sha256: 2fc2b63157270e76bcbf39729f5c77a0f02a851eea8314875f7c579f581fea06
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1507x921
quality: medium
format: jpeg
candidate_count: 5
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Command"
  - "Decider"
  - "Transaction"
  - "Event store"
  - "Hot projections"
  - "Command receipt"
  - "Read model"
  - "Async reactors"
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
  - "A command enters a side-effect-free decider."
  - "The transaction stores events, updates hot projections, and produces a parallel command receipt; the read model derives from hot projections, while asynchronous reactors begin only after commit."
alt_text: "A transaction cross-section shows durable event commit, hot projections, read model, command receipt, and asynchronous reaction."
extended_description: "A command enters a side-effect-free decider. The transaction stores events, updates hot projections, and produces a parallel command receipt; the read model derives from hot projections, while asynchronous reactors begin only after commit."
---

# Chapter 37 primary figure

Explanatory job: locate pure decision, durable event append, hot projection, command receipt, read
model, and post-commit reaction in their true ownership boundaries.

Reviewed sources: `decider.ts`; `OrchestrationEventStore.ts`; `ProjectionPipeline.ts`;
`OrchestrationEngine.ts`; `EngineCommandReactor.ts`.

Final correction history: the rejected synchronous metaphor and receipt-to-read-model chain are
gone. `EVENT STORE` feeds `HOT PROJECTIONS`, which feeds `READ MODEL`; `COMMAND RECEIPT` is a
parallel leaf inside the transaction with no outgoing arrow. `ASYNC REACTORS` remains a separate
post-commit branch. Evidence:
`apps/server/src/orchestration/Layers/OrchestrationEngine.ts`, lines 1204–1212 and 1223–1239.

Accessible equivalent: A command enters a side-effect-free decider. The transaction stores events,
updates hot projections, and produces a parallel command receipt; the read model derives from hot
projections, while asynchronous reactors begin only after commit.
