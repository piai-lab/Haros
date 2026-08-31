---
kind: generated-explanatory-visual
canonical_slot: ch-29-secondary
anchor_id: null
chapter: 29
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-29-secondary.jpg
sha256: 3105e5d7125e767f464f8c992a261dd7941dc480b9e183bbcbbbac17f0a11049
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1448x869
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Proven locally"
  - "Reported remotely"
  - "Diff"
  - "PR state"
  - "Tests"
  - "Mergeability"
  - "Do not infer merge readiness"
relation_contract:
  - "Local diff and test evidence do not by themselves prove remote PR state, mergeability, or merge readiness."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A matrix separates locally proven diff and tests from remotely reported PR state and mergeability, warning against inferred readiness."
extended_description: "Local diff and test evidence do not by themselves prove remote PR state, mergeability, or merge readiness."
---

# ch-29-secondary

Explanatory job: Local diff and test evidence do not by themselves prove remote PR state, mergeability, or merge readiness.

Reviewed sources: `apps/server/src/git/Layers/GitHubCli.test.ts`; `packages/shared/src/pullRequestList.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Local diff and test evidence do not by themselves prove remote PR state, mergeability, or merge readiness.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
