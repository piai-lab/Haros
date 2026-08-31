---
kind: generated-explanatory-visual
canonical_slot: ch-38-extra
anchor_id: null
chapter: 38
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-38-extra.jpg
sha256: 21afeaa47133aa8f23c4d711c003c1ca7e6e257b568c137d1d6c5cdfaa303a5c
model: gpt-image-2
generation_tool: gpt-image-2
size: 1518x454
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 2
accepted_attempt: 2
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Command ID"
  - "Prior receipt"
  - "Stored fingerprint"
  - "Incoming fingerprint"
  - "Compare"
  - "Equal"
  - "Different"
  - "Return prior result"
  - "Collision rejected"
relation_contract:
  - "Command ID points to Prior receipt, which exposes Stored fingerprint. Stored fingerprint and Incoming fingerprint both enter Compare. The Equal branch returns Return prior result; the Different branch reaches Collision rejected. No path creates or overwrites a receipt during retry."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A retry looks up the prior receipt by command ID, compares stored and incoming fingerprints, then returns the prior result or rejects a collision."
extended_description: "Command ID points to Prior receipt, which exposes Stored fingerprint. Stored fingerprint and Incoming fingerprint both enter Compare. The Equal branch returns Return prior result; the Different branch reaches Collision rejected. No path creates or overwrites a receipt during retry."
---

# ch-38-extra

Explanatory job: A retry looks up the prior receipt by command ID, compares stored and incoming fingerprints, then returns the prior result or rejects a collision.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: Command ID points to Prior receipt, which exposes Stored fingerprint. Stored fingerprint and Incoming fingerprint both enter Compare. The Equal branch returns Return prior result; the Different branch reaches Collision rejected. No path creates or overwrites a receipt during retry.

Revision history: Run 4 used 2 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
