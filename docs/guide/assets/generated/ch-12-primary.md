---
kind: generated-explanatory-visual
canonical_slot: ch-12-primary
anchor_id: null
chapter: 12
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-12-primary.jpg
sha256: 9b3c3dfccdb7e5d044fe160000c6d394be4b12f8e3343489ee673a70bb374db1
model: gpt-image-2
generation_tool: gpt-image-2
size: 1504x618
quality: medium
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Request"
  - "HostGateway authority boundary"
  - "Authorize"
  - "Authorized"
  - "Execute"
  - "Receipt"
  - "Declined"
  - "Decline"
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
  - "A request reaches HostGateway authorization."
  - "An authorized request can execute and produce a receipt; a declined request does not execute."
alt_text: "A HostGateway authority boundary separates authorization, execution, receipt, and decline."
extended_description: "A request reaches HostGateway authorization. An authorized request can execute and produce a receipt; a declined request does not execute."
---

# ch-12-primary

Explanatory job: Show HostGateway authorization, execution, decline, and receipt without a physical gate metaphor.

Reviewed source anchors:

- `docs/architecture.md#hostgateway`
- `apps/server/src/hostGateway/Layers/HostGateway.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: A request reaches HostGateway authorization. An authorized request can execute and produce a receipt; a declined request does not execute.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
