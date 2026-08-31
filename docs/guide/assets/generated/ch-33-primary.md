---
kind: generated-explanatory-visual
canonical_slot: ch-33-primary
anchor_id: G15
chapter: 33
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-33-primary.jpg
sha256: 34de8f0bf0fa2b5d884b443cd1e1021fdf2cea246d4e86e1777424f503685f6d
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1746x252
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 3
generation_budget_status: PASS-AT-FINAL-OUTPUT
exact_text:
  - "Inbox"
  - "Isolated workspace"
  - "Outbox"
  - "Captured deliverables"
relation_contract:
  - "Studio intake enters an isolated workspace; only Outbox entries become captured deliverables."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A four-stage Studio path runs from Inbox through isolated workspace and Outbox to captured deliverables."
extended_description: "Studio intake enters an isolated workspace; only Outbox entries become captured deliverables."
---

# ch-33-primary

Explanatory job: Studio intake enters an isolated workspace; only Outbox entries become captured deliverables.

Reviewed sources: `apps/server/src/studioWorkspaceScaffold.ts`; `apps/server/src/studioOutputs.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Studio intake enters an isolated workspace; only Outbox entries become captured deliverables.

Revision history: Run 3 used three built-in imagegen outputs. Executor review rejected the first for disconnected card-like boxes and selected-state styling, then rejected the second for an unlabeled separator. The final candidate contains only four labeled rectangles and three directional arrows and passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
