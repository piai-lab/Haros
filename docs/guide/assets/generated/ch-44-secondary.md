---
kind: generated-explanatory-visual
canonical_slot: ch-44-secondary
anchor_id: null
chapter: 44
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-44-secondary.jpg
sha256: 6f9b013a581e7b74520f03df4b583c64e24c697caec3044e07674c8553473f06
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1531x601
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Command retry"
  - "Command ID"
  - "Receipt lookup"
  - "Stored fingerprint"
  - "Incoming fingerprint"
  - "Compare"
  - "Equal"
  - "Different"
  - "Return original outcome"
  - "Collision rejected"
exact_text:
  - "Command ID"
  - "Receipt lookup"
  - "Stored fingerprint"
  - "Incoming fingerprint"
  - "Compare"
  - "Equal"
  - "Different"
  - "Return original outcome"
  - "Collision rejected"
relation_contract:
  - "Command ID points to Receipt lookup, then Stored fingerprint, then Compare. Incoming fingerprint enters the same comparison. The Equal branch reaches Return original outcome; the Different branch reaches Collision rejected. Original outcome means the accepted sequence or typed rejection represented by the stored receipt, not the receipt row itself."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A command retry looks up the stored fingerprint, compares incoming intent, and returns the original outcome or rejects a collision."
extended_description: "Command ID points to Receipt lookup, then Stored fingerprint, then Compare. Incoming fingerprint enters the same comparison. The Equal branch reaches Return original outcome; the Different branch reaches Collision rejected. Original outcome means the accepted sequence or typed rejection represented by the stored receipt, not the receipt row itself."
---

# ch-44-secondary

Explanatory job: A command retry looks up the stored fingerprint, compares incoming intent, and returns the original outcome or rejects a collision.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: Command ID points to Receipt lookup, then Stored fingerprint, then Compare. Incoming fingerprint enters the same comparison. The Equal branch reaches Return original outcome; the Different branch reaches Collision rejected. Original outcome means the accepted sequence or typed rejection represented by the stored receipt, not the receipt row itself.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
