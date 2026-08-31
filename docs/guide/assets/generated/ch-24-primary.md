---
kind: generated-explanatory-visual
canonical_slot: ch-24-primary
anchor_id: G13
chapter: 24
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-24-primary.jpg
sha256: 899310e52e7d7aa0f1fe8628ed988f8f90d75cb64c0cab62f31ae7e2ba8bceed
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1773x356
quality: built-in-default
format: jpeg
candidate_count: 3
generation_budget_status: WITHIN-CAP
exact_text:
  - "Product history"
  - "Handoff"
  - "New Engine Session"
relation_contract:
  - "Product history passes through an explicit Handoff record."
  - "Execution begins in a new Engine Session rather than continuing the source native Session."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Product history crosses a Handoff boundary into a new Engine Session."
extended_description: "Two explicit left-to-right arrows connect Product history to Handoff and Handoff to New Engine Session. The new native Session begins after the handoff; source native Session state is not shown crossing the boundary."
---

# ch-24-primary

Explanatory job: Teach the cross-Engine handoff boundary.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/handoff.ts`; `apps/server/src/orchestration/handoff.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Two explicit left-to-right arrows connect Product history to Handoff and Handoff to New Engine Session. The new native Session begins after the handoff; source native Session state is not shown crossing the boundary.

Revision history: Run 3 used three built-in imagegen outputs. Candidate 1 failed natural-case review;
candidate 2 corrected case but lacked directional arrows. Candidate 3 uses natural-case labels and
two explicit left-to-right arrows, then passed full-resolution text, relationship, forbidden-family,
and K-037 crop review. The normal three-candidate budget is closed.
