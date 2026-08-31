---
kind: generated-explanatory-visual
canonical_slot: ch-38-secondary
anchor_id: null
chapter: 38
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-38-secondary.jpg
sha256: 0fbf8ffa34c5bc017315a65fc319c76f5cbc1cfba530ac2d1ea1e4f8e71c9a78
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1474x719
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Projection repair"
  - "Refresh local snapshot"
  - "Capture fence N"
  - "Ordered pages"
  - "Advance cursors"
  - "Verify all at N"
  - "Failure"
  - "Restore staged metadata and cursors"
  - "Events unchanged"
  - "Receipts unchanged"
exact_text:
  - "Refresh local snapshot"
  - "Capture fence N"
  - "Ordered pages"
  - "Advance cursors"
  - "Verify all at N"
  - "Failure"
  - "Restore staged metadata and cursors"
  - "Events unchanged"
  - "Receipts unchanged"
relation_contract:
  - "Capture fence N flows through Ordered pages, Advance cursors, and Verify all at N. Success reaches Refresh local snapshot. The failure branch reaches Failure and then Restore staged metadata and cursors. Two invariant bars read Events unchanged and Receipts unchanged. In the pinned source alpha, the staged metadata is the Project/Space repair surface plus designated projector cursor state; existing Thread and Chat rows remain in place."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A bounded repair replays ordered pages to cursor fence N, refreshes the local snapshot on success, and restores staged metadata and cursors on failure."
extended_description: "Capture fence N flows through Ordered pages, Advance cursors, and Verify all at N. Success reaches Refresh local snapshot. The failure branch reaches Failure and then Restore staged metadata and cursors. Two invariant bars read Events unchanged and Receipts unchanged. In the pinned source alpha, the staged metadata is the Project/Space repair surface plus designated projector cursor state; existing Thread and Chat rows remain in place."
---

# ch-38-secondary

Explanatory job: A bounded repair replays ordered pages to cursor fence N, refreshes the local snapshot on success, and restores staged metadata and cursors on failure.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: Capture fence N flows through Ordered pages, Advance cursors, and Verify all at N. Success reaches Refresh local snapshot. The failure branch reaches Failure and then Restore staged metadata and cursors. Two invariant bars read Events unchanged and Receipts unchanged. In the pinned source alpha, the staged metadata is the Project/Space repair surface plus designated projector cursor state; existing Thread and Chat rows remain in place.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
