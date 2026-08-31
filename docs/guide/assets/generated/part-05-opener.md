---
kind: generated-explanatory-visual
canonical_slot: part-05-opener
anchor_id: null
chapter: null
visual_family: haros-grounded-editorial-anatomy
style_master: true
file: part-05-opener.jpg
sha256: 0e1a258692e401d665ee1dcd22dd5f1ec177be2bcc02edd3288393525e3ef147
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1525x895
quality: medium
format: jpeg
candidate_count: 4
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Web workbench"
  - "Product orchestration"
  - "Commands"
  - "Events"
  - "Persistence"
  - "Projections"
  - "Read model"
  - "Engine reactors"
  - "Engine adapters"
  - "Scoped capability channel"
  - "HostGateway"
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
  - "The Web workbench submits commands to Product Orchestration."
  - "Accepted events are persisted, projected into a read model, and read back by the Web workbench."
  - "Committed events also reach Engine Reactors and adapters; scoped local capability calls pass through HostGateway."
alt_text: "An architecture cross-section connects Web workbench, Product orchestration, Engine reactors, adapters, and HostGateway."
extended_description: "The Web workbench submits commands to Product Orchestration. Accepted events are persisted, projected into a read model, and read back by the Web workbench. Committed events also reach Engine Reactors and adapters; scoped local capability calls pass through HostGateway."
---

# Part V opener

Explanatory job: establish Product Orchestration as the product-fact owner between Web workbench,
persistence, projections/read model, and bounded side effects.

Reviewed sources: `docs/architecture.md`; `OrchestrationEngine.ts`;
`OrchestrationReactor.ts`; HostGateway ownership documentation.

Final correction history: the rejected mechanical cutaway is gone; the Projections → Read Model →
Web path remains explicit, while committed events branch asynchronously through `ENGINE REACTORS`
and `ENGINE ADAPTERS` before a labeled `SCOPED CAPABILITY CHANNEL` reaches `HOSTGATEWAY`. There is
no Reactor-to-HostGateway shortcut. Evidence: `docs/architecture.md#HostGateway`, lines 24–37;
`apps/server/src/serverLayers.ts`, lines 263–275; and
`apps/server/src/codexAppServerManager.ts`, lines 982–998 and 1056–1067.

Accessible equivalent: The Web workbench submits commands to Product Orchestration. Accepted events
are persisted, projected into a read model, and read back by the Web workbench. Committed events
also reach Engine Reactors and adapters; scoped local capability calls pass through HostGateway.
