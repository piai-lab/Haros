---
kind: generated-explanatory-visual
canonical_slot: ch-28-extra-01
anchor_id: null
chapter: 28
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-28-extra-01.jpg
sha256: 1c7e390ac6c33fc5087aad7907333475f5da2cbaef5e0d66da1b95bef4754b4e
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1501x855
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Revert refused"
  - "Preserve files"
  - "Rollback refused"
  - "Preserve history"
  - "Resend launch fails"
  - "Preserve prompt"
relation_contract:
  - "Refused or failed rollback operations preserve the files, history, or prompt they could not safely replace."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Three failure rows map refused revert, refused rollback, and failed resend launch to preserving files, history, and prompt."
extended_description: "Refused or failed rollback operations preserve the files, history, or prompt they could not safely replace."
---

# ch-28-extra-01

Explanatory job: Refused or failed rollback operations preserve the files, history, or prompt they could not safely replace.

Reviewed sources: `apps/server/src/orchestration/decider.checkpointRevert.test.ts`; `apps/server/src/orchestration/Layers/EngineCommandReactor.integration.test.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Refused or failed rollback operations preserve the files, history, or prompt they could not safely replace.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
