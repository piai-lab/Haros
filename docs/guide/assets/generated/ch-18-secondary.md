---
kind: generated-explanatory-visual
canonical_slot: ch-18-secondary
anchor_id: null
chapter: 18
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-18-secondary.jpg
sha256: 7bed3bbeacfe6fc9d96cec8c4f4403cc3dd9369c18b04179095adcbbbea657e4
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1504x778
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Goal state"
  - "Active → Paused → Resumed → Achieved"
  - "Paused work"
  - "Does not resume automatically"
  - "Active time"
  - "Paused interval excluded"
relation_contract:
  - "Goal state may move from Active to Paused to Resumed to Achieved."
  - "Paused work does not resume automatically."
  - "Active-time accounting excludes the paused interval."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Goal-state matrix says paused work does not resume automatically and the paused interval is excluded from active time."
extended_description: "A three-row state matrix maps Goal state to Active, Paused, Resumed, Achieved; Paused work to Does not resume automatically; and Active time to Paused interval excluded."
---

# ch-18-secondary

Explanatory job: Explain pause, resume rebasing, and active pursuit time.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.goalTiming.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: A three-row state matrix maps Goal state to Active, Paused, Resumed, Achieved; Paused work to Does not resume automatically; and Active time to Paused interval excluded.

Revision history: Run 3 used two built-in imagegen outputs. Full-resolution review rejected the
first for an unlabeled stop glyph. Candidate 2 is a fully labelled state matrix and passed text,
relationship, forbidden-family, natural-case, and K-037 crop review.
