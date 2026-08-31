---
kind: generated-explanatory-visual
canonical_slot: ch-25-secondary
anchor_id: null
chapter: 25
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-25-secondary.jpg
sha256: 92fefbfecf121653f7ab41334146c7d98f71744407ad7ade650ef80090c9ab17
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1689x535
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 3
generation_budget_status: PASS-AT-FINAL-OUTPUT
exact_text:
  - "Inside workspace"
  - "Outside workspace"
  - "File service"
  - "Resolve reference"
  - "Preview grant"
  - "No write grant"
relation_contract:
  - "Inside-workspace files use the File service; outside references require resolution and a preview grant that does not grant writes."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Two lanes contrast direct in-workspace file access with out-of-workspace reference resolution, preview granting, and no write grant."
extended_description: "Inside-workspace files use the File service; outside references require resolution and a preview grant that does not grant writes."
---

# ch-25-secondary

Explanatory job: Inside-workspace files use the File service; outside references require resolution and a preview grant that does not grant writes.

Reviewed sources: `packages/contracts/src/project.ts`; `apps/server/src/workspace/outOfRootFileReference.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Inside-workspace files use the File service; outside references require resolution and a preview grant that does not grant writes.

Revision history: Run 3 used three built-in imagegen outputs. Full-resolution review rejected the first for unlabeled glyphs and the second for a redundant T-shaped terminal marker. The final candidate ends at the labeled No write grant rectangle and passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
