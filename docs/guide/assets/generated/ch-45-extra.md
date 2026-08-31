---
kind: generated-explanatory-visual
canonical_slot: ch-45-extra
anchor_id: null
chapter: 45
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-45-extra.jpg
sha256: 1a6dfb286538e32dbd371b53d3033cbc559ef2416d23c264381788da388e9825
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1516x747
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 2
accepted_attempt: 2
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
exact_text:
  - "Quit"
  - "Normal quit"
  - "Quit and resume"
  - "Prepare resume record"
  - "Quiesce"
  - "Shutdown"
  - "Next startup"
  - "Claim resume record"
relation_contract:
  - "Quit branches to Normal quit and Quit and resume. Normal quit points to Quiesce; Quit and resume points to Prepare resume record, then Quiesce. The shared path continues from Quiesce to Shutdown to Next startup. Only the resume branch conditionally continues from Next startup to Claim resume record."
acceptance_exact_text: PASS-full-resolution-source-QA
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Normal quit and quit-and-resume converge on quiescing and shutdown, while only the resume branch prepares a one-shot record for the next startup."
extended_description: "Quit branches to Normal quit and Quit and resume. Normal quit points to Quiesce; Quit and resume points to Prepare resume record, then Quiesce. The shared path continues from Quiesce to Shutdown to Next startup. Only the resume branch conditionally continues from Next startup to Claim resume record."
---

# ch-45-extra

Explanatory job: Normal quit and quit-and-resume converge on quiescing and shutdown, while only the resume branch prepares a one-shot record for the next startup.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Final prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; only the declared exact-text inventory and frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Accessible equivalent: Quit branches to Normal quit and Quit and resume. Normal quit points to Quiesce; Quit and resume points to Prepare resume record, then Quiesce. The shared path continues from Quiesce to Shutdown to Next startup. Only the resume branch conditionally continues from Next startup to Claim resume record.

Revision history: Run 4 used 2 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
