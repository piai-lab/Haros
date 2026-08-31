---
kind: generated-explanatory-visual
canonical_slot: ch-40-primary
anchor_id: null
chapter: 40
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-40-primary.jpg
sha256: 2ee0914e23b0571ed93192193044a44df97bc831b649aab6d119cb6fea4f54ea
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x1024
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Product Thread"
  - "Native Session"
  - "Product history"
  - "Bounded bootstrap context"
  - "Start or resume native Session"
  - "Engine adapter"
  - "Private state"
  - "No private state transfer"
relation_contract:
  - "The Product Thread contains Haros-owned messages, Turns, Queue, Timeline, lineage, workspace metadata, and recovery. An exact Engine/model binding selects one adapter. The adapter starts or resumes a native Session owned by that Engine and returns canonical runtime events. When the Engine changes, the Product Thread remains, but the previous native Session does not cross the adapter boundary; the destination starts a new native Session with only explicitly admitted product context."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Product Thread remains durable while an Engine adapter connects it to one replaceable native Session at a time."
extended_description: "The Product Thread contains Haros-owned messages, Turns, Queue, Timeline, lineage, workspace metadata, and recovery. An exact Engine/model binding selects one adapter. The adapter starts or resumes a native Session owned by that Engine and returns canonical runtime events. When the Engine changes, the Product Thread remains, but the previous native Session does not cross the adapter boundary; the destination starts a new native Session with only explicitly admitted product context."
---

# ch-40-primary

Explanatory job: A Product Thread remains durable while an Engine adapter connects it to one replaceable native Session at a time.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: The Product Thread contains Haros-owned messages, Turns, Queue, Timeline, lineage, workspace metadata, and recovery. An exact Engine/model binding selects one adapter. The adapter starts or resumes a native Session owned by that Engine and returns canonical runtime events. When the Engine changes, the Product Thread remains, but the previous native Session does not cross the adapter boundary; the destination starts a new native Session with only explicitly admitted product context.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
