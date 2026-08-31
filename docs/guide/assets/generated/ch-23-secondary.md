---
kind: generated-explanatory-visual
canonical_slot: ch-23-secondary
anchor_id: null
chapter: 23
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-23-secondary.jpg
sha256: a7f105785e882293c4175016abad827e79706f2da124311252b46fa515f06d24
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1641x701
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "History-only"
  - "Exact prefix"
  - "Fail closed"
  - "Chat-to-Agent"
  - "Newest history"
  - "Omission marked"
relation_contract:
  - "History-only requires an exact prefix and fails closed when it cannot fit."
  - "Chat-to-Agent keeps bounded newest history and marks omission."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A two-row matrix compares exact history-only forks with bounded Chat-to-Agent forks."
extended_description: "History-only requires an exact prefix and fails closed when that prefix cannot fit. Chat-to-Agent keeps bounded newest history and marks the omission."
---

# ch-23-secondary

Explanatory job: Compare the two fork-scope bootstrap policies.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.forkScope.test.ts`; `apps/server/src/orchestration/engineSessionThread.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: History-only requires an exact prefix and fails closed when that prefix cannot fit. Chat-to-Agent keeps bounded newest history and marks the omission.

Revision history: generated with the built-in imagegen path, accepted after candidate 2,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
