---
kind: generated-explanatory-visual
canonical_slot: ch-24-extra-01
anchor_id: null
chapter: 24
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-24-extra-01.jpg
sha256: def5d2c290f6086a9d9233c8959c880134e4cca7a1201829dbcea79e6a39bcad
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x1024
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Source history"
  - "Retained"
  - "Handoff record"
  - "Visible"
  - "Target start"
  - "Failed"
  - "Native continuation"
  - "Not promised"
relation_contract:
  - "A failed target start leaves source history retained and the Handoff record visible."
  - "Native continuation is not promised."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A failure matrix retains source history and handoff visibility when target start fails."
extended_description: "The matrix states Source history: Retained; Handoff record: Visible; Target start: Failed; Native continuation: Not promised."
---

# ch-24-extra-01

Explanatory job: Show truthful recovery when the handoff target cannot start.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/handoff.ts`; `apps/server/src/orchestration/handoff.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The matrix states Source history: Retained; Handoff record: Visible; Target start: Failed; Native continuation: Not promised.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
