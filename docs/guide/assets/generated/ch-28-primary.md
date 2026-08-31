---
kind: generated-explanatory-visual
canonical_slot: ch-28-primary
anchor_id: null
chapter: 28
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-28-primary.jpg
sha256: 3e90baf435e99928f22cc7c9f4514fddc52ffa33cafd5f99ef9da3ee8b87f2d1
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1482x938
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Checkpoint revert"
  - "Working tree"
  - "Conversation rollback"
  - "Visible history"
  - "Different owners"
relation_contract:
  - "Checkpoint revert changes file state, while conversation rollback changes visible product history; they have different owners."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Perpendicular axes separate checkpoint revert and working-tree state from conversation rollback and visible history."
extended_description: "Checkpoint revert changes file state, while conversation rollback changes visible product history; they have different owners."
---

# ch-28-primary

Explanatory job: Checkpoint revert changes file state, while conversation rollback changes visible product history; they have different owners.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.checkpointRevert.test.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Checkpoint revert changes file state, while conversation rollback changes visible product history; they have different owners.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
