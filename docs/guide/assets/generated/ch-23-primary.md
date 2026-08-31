---
kind: generated-explanatory-visual
canonical_slot: ch-23-primary
anchor_id: null
chapter: 23
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-23-primary.jpg
sha256: 80b6d32612543237dd4de83add3a00e07c7c793bef6f6e3762f7e49122fa3367
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1763x592
quality: built-in-default
format: jpeg
candidate_count: 3
generation_budget_status: WITHIN-CAP
exact_text:
  - "Source history"
  - "Cutoff message"
  - "Imported prefix"
  - "Fork boundary"
  - "New Thread"
  - "New history"
relation_contract:
  - "History-only fork input stops at an exact cutoff message."
  - "The imported prefix crosses into a newly created Thread."
  - "New history begins after the fork boundary."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A history-only fork imports an exact source prefix into a new Thread, then starts new history."
extended_description: "History-only Fork input stops at an exact cutoff Message. The imported prefix crosses into a newly created Thread at the labelled Fork boundary, and new history begins after that boundary."
---

# ch-23-primary

Explanatory job: Make the exact fork history boundary visible.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.forkScope.test.ts`; `apps/server/src/orchestration/engineSessionThread.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: History-only Fork input stops at an exact cutoff Message. The imported prefix crosses into a newly created Thread at the labelled Fork boundary, and new history begins after that boundary.

Revision history: Run 3 used three built-in imagegen outputs. Earlier candidates did not make the
source-to-target direction fully explicit. Candidate 3 uses arrowheads across every transition and
passed full-resolution text, relationship, forbidden-family, natural-case, and K-037 review.
