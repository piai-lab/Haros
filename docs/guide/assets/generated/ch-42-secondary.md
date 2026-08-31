---
kind: generated-explanatory-visual
canonical_slot: ch-42-secondary
anchor_id: null
chapter: 42
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-42-secondary.jpg
sha256: 4ec8941292dcdbb0c81f3aaf3c1df8a4739cae3c71d7b05129ea44231a2ffdae
model: gpt-image-2
generation_tool: gpt-image-2
size: 1476x653
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 1
accepted_attempt: 1
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Shell stream"
  - "Detail stream"
  - "Subscription limit"
  - "Backpressure"
  - "Retry backoff"
  - "Reconcile"
relation_contract:
  - "Shell stream and Detail stream enter Subscription limit, which points to Backpressure. Backpressure points both to Retry backoff and to Reconcile; retry backoff loops to subscription admission. The loop is bounded recovery, not silent continuation after dropped product events."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Shell and detail streams share subscription admission, bounded backpressure, retry backoff, and explicit reconciliation."
extended_description: "Shell stream and Detail stream enter Subscription limit, which points to Backpressure. Backpressure points both to Retry backoff and to Reconcile; retry backoff loops to subscription admission. The loop is bounded recovery, not silent continuation after dropped product events."
---

# ch-42-secondary

Explanatory job: Shell and detail streams share subscription admission, bounded backpressure, retry backoff, and explicit reconciliation.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: Shell stream and Detail stream enter Subscription limit, which points to Backpressure. Backpressure points both to Retry backoff and to Reconcile; retry backoff loops to subscription admission. The loop is bounded recovery, not silent continuation after dropped product events.

Revision history: Run 4 used 1 rendered output for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
