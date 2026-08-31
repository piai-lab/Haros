---
kind: generated-explanatory-visual
canonical_slot: ch-22-primary
anchor_id: G12
chapter: 22
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-22-primary.jpg
sha256: d86aa51f95dea4e3745d7a94aa076b2fb77c1e5ca2c1828843147607ee444a0c
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1580x745
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Source task"
  - "Sidechat"
  - "Subagent"
  - "Fork"
relation_contract:
  - "A source task can have Sidechat, Subagent, and Fork descendants."
  - "The three child relationships remain distinct."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Source Task has three distinct descendants: Sidechat, Subagent, and Fork."
extended_description: "Source task is connected to three separately bounded descendants: Sidechat, Subagent, and Fork. The three sibling relations remain distinct; no child contains another."
---

# ch-22-primary

Explanatory job: Introduce visible Thread lineage without collapsing child types.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/web/src/components/chat/ComposerSubagentStrip.logic.ts`; `apps/web/src/components/chat/ForkSourceDivider.tsx`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Source task is connected to three separately bounded descendants: Sidechat, Subagent, and Fork. The three sibling relations remain distinct; no child contains another.

Revision history: Run 3 used two built-in imagegen outputs. Candidate 2 normalized all labels to
natural sentence case and passed full-resolution text, relationship, forbidden-family, and K-037 review.
