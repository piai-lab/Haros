---
kind: generated-explanatory-visual
canonical_slot: ch-16-secondary
anchor_id: null
chapter: 16
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-16-secondary.jpg
sha256: 132cacde2e4643346eb844df3270203a2164f093c708a0a8f9aa1e1aa50f781a
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1693x913
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Before"
  - "Delete Group"
  - "After"
  - "Thread retained"
  - "Membership removed"
  - "Project unchanged"
relation_contract:
  - "Deleting a Group removes membership."
  - "The Thread and its Project ownership remain."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A before-and-after matrix shows Group deletion removing membership while retaining the Thread and Project."
extended_description: "Before deletion, a Thread has Group membership. Delete Group removes the membership. Afterward the Project and Thread remain; the Project is unchanged."
---

# ch-16-secondary

Explanatory job: Explain the non-destructive result of deleting a Group.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/conversationGroups.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Before deletion, a Thread has Group membership. Delete Group removes the membership. Afterward the Project and Thread remain; the Project is unchanged.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
