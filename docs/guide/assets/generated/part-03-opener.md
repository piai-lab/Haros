---
kind: generated-explanatory-visual
canonical_slot: part-03-opener
anchor_id: null
chapter: null
visual_family: haros-technical-editorial-diagram
style_master: false
file: part-03-opener.jpg
sha256: 4a4cefe5cf73dcd40e717069314255a15bde7de657ea938aa15610b9ac549bf1
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1607x821
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Durable Thread"
  - "Organize"
  - "Clarify"
  - "Extend"
  - "Ownership preserved"
relation_contract:
  - "Within one Durable Thread, Organize leads to Clarify and Clarify leads to Extend."
  - "Ownership preserved applies across all three stages."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Durable Thread crosses Organize, Clarify, and Extend while ownership remains preserved."
extended_description: "Within a Durable Thread boundary, three labelled rectangles form the directional path Organize, Clarify, Extend. A lower labelled band states Ownership preserved across the path."
---

# part-03-opener

Explanatory job: Summarize Part III as organization and extension around one durable line of work.

Reviewed sources: `docs/haros-guidebook-plan.md`; `packages/contracts/src/orchestration.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Within a Durable Thread boundary, three labelled rectangles form the directional path Organize, Clarify, Extend. A lower labelled band states Ownership preserved across the path.

Revision history: Run 3 used two built-in imagegen outputs. Full-resolution review rejected the
first for unlabeled junction glyphs. Candidate 2 uses labelled rectangles and directional arrows
only, then passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
