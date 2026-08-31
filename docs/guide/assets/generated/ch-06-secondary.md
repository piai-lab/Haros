---
kind: generated-explanatory-visual
canonical_slot: ch-06-secondary
anchor_id: null
chapter: 6
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-06-secondary.jpg
sha256: b5416926ea7a025c10255a664ee6172921e064ab9137a068a434fb4a0206fd8d
model: gpt-image-2
generation_tool: gpt-image-2
size: 1503x849
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Request path"
  - "Local intent"
  - "Explicit request"
  - "Authorized connection"
  - "Connected service"
  - "Return path"
  - "Result returned"
  - "Haros state"
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
  - "Local intent becomes an explicit request, crosses an authorized connection to a connected service, and returns a result to Haros state."
  - "The connection is neither ambient nor evidence that all work leaves the machine."
alt_text: "Separate request and return paths bound a connected-service call."
extended_description: "Local intent becomes an explicit request, crosses an authorized connection to a connected service, and returns a result to Haros state. The connection is neither ambient nor evidence that all work leaves the machine."
---

# Chapter 6 secondary figure

Explanatory job: show a bounded, authorized outward round trip.

Reviewed source anchors: `docs/architecture.md#hostgateway`;
`apps/server/src/hostGateway/mcpInjection.ts`; `apps/server/src/hostGateway/sessionLease.ts`.

Final prompt: `LOCAL INTENT → EXPLICIT REQUEST → AUTHORIZED CONNECTION → CONNECTED SERVICE`; a
separate return arrow labeled `RESULT RETURNED` reaches `HAROS STATE`; exact labels only.

Settings: `gpt-image-2`, medium, 1536×1024, JPEG quality 88. Candidate 1 passed full-resolution QA.

Accessible equivalent: Local intent becomes an explicit request, crosses an authorized connection
to a connected service, and returns a result to Haros state. The connection is neither ambient nor
evidence that all work leaves the machine.
