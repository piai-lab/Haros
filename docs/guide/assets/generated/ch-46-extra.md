---
kind: generated-explanatory-visual
canonical_slot: ch-46-extra
anchor_id: null
chapter: 46
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-46-extra.jpg
sha256: 0b48655914afcf3e0c9f71a4632c7872f75e014516acc4f67ca267e367496cb9
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1526x928
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Bounded outbound request"
  - "Request URL"
  - "Origin allowlist"
  - "Public address"
  - "Fetch"
  - "Bounded JSON"
  - "Cross-origin redirect"
  - "Revalidate origin"
  - "Strip sensitive headers"
  - "Revalidate address"
exact_text:
  - "Request URL"
  - "Origin allowlist"
  - "Public address"
  - "Fetch"
  - "Bounded JSON"
  - "Cross-origin redirect"
  - "Revalidate origin"
  - "Strip sensitive headers"
  - "Revalidate address"
relation_contract:
  - "The initial path is Request URL to Origin allowlist, Public address, Fetch, and Bounded JSON. A Cross-origin redirect from Fetch starts a loop through Revalidate origin, Strip sensitive headers, and Revalidate address before returning to Fetch."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "An outbound request validates origin and public address before fetch, then revalidates a cross-origin redirect and strips sensitive headers before the next address check."
extended_description: "The initial path is Request URL to Origin allowlist, Public address, Fetch, and Bounded JSON. A Cross-origin redirect from Fetch starts a loop through Revalidate origin, Strip sensitive headers, and Revalidate address before returning to Fetch."
---

# ch-46-extra

Explanatory job: An outbound request validates origin and public address before fetch, then revalidates a cross-origin redirect and strips sensitive headers before the next address check.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: The initial path is Request URL to Origin allowlist, Public address, Fetch, and Bounded JSON. A Cross-origin redirect from Fetch starts a loop through Revalidate origin, Strip sensitive headers, and Revalidate address before returning to Fetch.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
