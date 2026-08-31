---
kind: generated-explanatory-visual
canonical_slot: ch-22-extra-01
anchor_id: null
chapter: 22
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-22-extra-01.jpg
sha256: 1f6a1cd35b5a899048304cbbbfe1cea23212a1c37395eea33fdf5049e1e2bb04
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1496x866
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Child lifecycle"
  - "Running → Failed"
  - "Parent state"
  - "Retained"
  - "Lineage"
  - "Retained"
  - "Result"
  - "No automatic merge"
relation_contract:
  - "A Child lifecycle can move from Running to Failed."
  - "Parent state and Lineage remain retained."
  - "Failure creates no automatic result merge."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A failure matrix retains parent state and lineage when a child fails, with no automatic merge."
extended_description: "The matrix rows are Child lifecycle: Running to Failed; Parent state: Retained; Lineage: Retained; Result: No automatic merge."
---

# ch-22-extra-01

Explanatory job: Explain child failure without erasing parent or lineage.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/projector.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The matrix rows are Child lifecycle: Running to Failed; Parent state: Retained; Lineage: Retained; Result: No automatic merge.

Revision history: generated with the built-in imagegen path, accepted after candidate 2,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
