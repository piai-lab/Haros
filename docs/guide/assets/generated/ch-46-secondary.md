---
kind: generated-explanatory-visual
canonical_slot: ch-46-secondary
anchor_id: null
chapter: 46
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-46-secondary.jpg
sha256: f958336237403f8f880abdb0686efda6c9ddd77cf8756d315de0ae012c99dc20
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1473x844
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Independent security gates"
  - "Inbound browser request"
  - "Origin policy"
  - "Session authentication"
  - "Authorized inbound request"
  - "Outbound capability request"
  - "Outbound policy"
  - "Allowed destination"
  - "Secret store"
  - "Credential-blind projection"
  - "UI consumer"
exact_text:
  - "Inbound browser request"
  - "Origin policy"
  - "Session authentication"
  - "Authorized inbound request"
  - "Outbound capability request"
  - "Outbound policy"
  - "Allowed destination"
  - "Secret store"
  - "Credential-blind projection"
  - "UI consumer"
relation_contract:
  - "In the inbound group, Inbound browser request branches independently to Origin policy and Session authentication; both are required before Authorized inbound request. In the outbound group, Outbound capability request points to Outbound policy and then Allowed destination. In the projection group, Secret store points to Credential-blind projection and then UI consumer. The three groups are separate, not a single sequence."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Authentication, inbound Origin policy, outbound destination policy, and credential-blind projection are independent security gates."
extended_description: "In the inbound group, Inbound browser request branches independently to Origin policy and Session authentication; both are required before Authorized inbound request. In the outbound group, Outbound capability request points to Outbound policy and then Allowed destination. In the projection group, Secret store points to Credential-blind projection and then UI consumer. The three groups are separate, not a single sequence."
---

# ch-46-secondary

Explanatory job: Authentication, inbound Origin policy, outbound destination policy, and credential-blind projection are independent security gates.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: In the inbound group, Inbound browser request branches independently to Origin policy and Session authentication; both are required before Authorized inbound request. In the outbound group, Outbound capability request points to Outbound policy and then Allowed destination. In the projection group, Secret store points to Credential-blind projection and then UI consumer. The three groups are separate, not a single sequence.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
