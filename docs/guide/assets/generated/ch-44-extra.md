---
kind: generated-explanatory-visual
canonical_slot: ch-44-extra
anchor_id: null
chapter: 44
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-44-extra.jpg
sha256: b78789c86010330f1924f599ba430a109f1be504bf7541f985d1095a511379fe
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1514x400
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 2
accepted_attempt: 2
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Cancellation path"
  - "In-flight request"
  - "Turn tombstone"
  - "Cancel drain"
  - "Control returned"
  - "Session revoke if needed"
  - "Native interruption"
exact_text:
  - "In-flight request"
  - "Turn tombstone"
  - "Cancel drain"
  - "Control returned"
  - "Session revoke if needed"
  - "Native interruption"
relation_contract:
  - "The main path is In-flight request to Turn tombstone, Cancel drain, and Control returned. A separate branch leaves Turn tombstone for Session revoke if needed and then Native interruption. Revocation is not drawn as a mandatory step after every drain; native interruption and gateway drainage may proceed concurrently under the shared tombstone."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Cancellation tombstones an in-flight Turn, drains matching work, and conditionally revokes a Session before native interruption."
extended_description: "The main path is In-flight request to Turn tombstone, Cancel drain, and Control returned. A separate branch leaves Turn tombstone for Session revoke if needed and then Native interruption. Revocation is not drawn as a mandatory step after every drain; native interruption and gateway drainage may proceed concurrently under the shared tombstone."
---

# ch-44-extra

Explanatory job: Cancellation tombstones an in-flight Turn, drains matching work, and conditionally revokes a Session before native interruption.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: The main path is In-flight request to Turn tombstone, Cancel drain, and Control returned. A separate branch leaves Turn tombstone for Session revoke if needed and then Native interruption. Revocation is not drawn as a mandatory step after every drain; native interruption and gateway drainage may proceed concurrently under the shared tombstone.

Revision history: Run 4 used 2 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
