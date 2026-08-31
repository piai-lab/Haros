---
kind: generated-explanatory-visual
canonical_slot: ch-19-secondary
anchor_id: null
chapter: 19
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-19-secondary.jpg
sha256: 70f40e96840500caec7408e0dcc68ad81377eba123fe907410f2c8a3579be7c7
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1520x927
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Planning Thread"
  - "Plan snapshot"
  - "Implementation Thread"
  - "New Turns"
  - "No history rewrite"
relation_contract:
  - "The Planning Thread retains the Plan snapshot."
  - "The Implementation Thread owns its New Turns."
  - "The provenance link does not rewrite either history."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Planning and Implementation Threads keep separate histories linked by a plan snapshot."
extended_description: "The Planning Thread retains the Plan snapshot, while the Implementation Thread owns its New Turns. A dashed provenance link joins them but does not rewrite either history."
---

# ch-19-secondary

Explanatory job: Separate planning history from implementation history.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/web/src/components/chat/ProposedPlanCard.tsx`; `apps/server/src/persistence/Layers/ProjectionThreadProposedPlans.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The Planning Thread retains the Plan snapshot, while the Implementation Thread owns its New Turns. A dashed provenance link joins them but does not rewrite either history.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
