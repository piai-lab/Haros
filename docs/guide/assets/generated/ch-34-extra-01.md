---
kind: generated-explanatory-visual
canonical_slot: ch-34-extra-01
anchor_id: null
chapter: 34
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-34-extra-01.jpg
sha256: 3d1dd15460f7a261ebd1a0d624cabf5dfc327fa2ee3f449f25feafdee3e3bb8e
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1527x829
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Schedule invalid"
  - "No run"
  - "Permission denied"
  - "No side effect"
  - "Run fails"
  - "Record failure"
relation_contract:
  - "Invalid schedule prevents a run, denied permission prevents side effects, and execution failure is recorded."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Three automation failure rows map invalid schedule, denied permission, and failed run to conservative recorded outcomes."
extended_description: "Invalid schedule prevents a run, denied permission prevents side effects, and execution failure is recorded."
---

# ch-34-extra-01

Explanatory job: Invalid schedule prevents a run, denied permission prevents side effects, and execution failure is recorded.

Reviewed sources: `apps/server/src/automation/Layers/AutomationService.integration.test.ts`; `packages/shared/src/automationMode.test.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Invalid schedule prevents a run, denied permission prevents side effects, and execution failure is recorded.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
