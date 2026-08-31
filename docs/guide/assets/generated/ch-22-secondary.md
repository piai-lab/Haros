---
kind: generated-explanatory-visual
canonical_slot: ch-22-secondary
anchor_id: null
chapter: 22
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-22-secondary.jpg
sha256: 0a765317acec6ff223099cef9edabd8b6c43006f252a1b85838579724210969f
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1541x593
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Parent Thread"
  - "Child Thread"
  - "Source link"
  - "Agent identity"
  - "Independent lifecycle"
  - "Results return explicitly"
relation_contract:
  - "Parent and Child Threads are separate and joined by a source link."
  - "The child has its own Agent identity and lifecycle."
  - "Results return only through an explicit path."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Parent Thread and Child Thread have visible lineage but separate identity and lifecycle."
extended_description: "Parent and Child Threads remain separate and are joined by a dashed source link. The child has its own Agent identity and independent lifecycle, and results return only through an explicit path to the parent."
---

# ch-22-secondary

Explanatory job: Map lineage, lifecycle, and explicit responsibility return.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/web/src/components/chat/ComposerSubagentStrip.logic.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Parent and Child Threads remain separate and are joined by a dashed source link. The child has its own Agent identity and independent lifecycle, and results return only through an explicit path to the parent.

Revision history: generated with the built-in imagegen path, accepted after candidate 2,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
