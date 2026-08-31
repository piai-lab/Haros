---
kind: generated-explanatory-visual
canonical_slot: ch-34-primary
anchor_id: G16
chapter: 34
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-34-primary.jpg
sha256: 8d2ed137b332068502cbfb7de9db78c8a36e4ba36d6e927ebd989919a270f5f4
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1380x867
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Schedule"
  - "Run"
  - "Result"
  - "Memory"
  - "Next run"
relation_contract:
  - "An automation schedule admits a run, records its result and bounded memory, then determines the next run."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A five-node automation loop cycles through schedule, run, result, memory, and next run."
extended_description: "An automation schedule admits a run, records its result and bounded memory, then determines the next run."
---

# ch-34-primary

Explanatory job: An automation schedule admits a run, records its result and bounded memory, then determines the next run.

Reviewed sources: `apps/server/src/automation/Layers/AutomationService.ts`; `apps/server/src/automation/Layers/AutomationScheduler.test.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: An automation schedule admits a run, records its result and bounded memory, then determines the next run.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
