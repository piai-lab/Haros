---
kind: generated-explanatory-visual
canonical_slot: ch-18-extra-01
anchor_id: null
chapter: 18
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-18-extra-01.jpg
sha256: 914ab93318160a0145a67a6a1e314c046ea9919a4eb3f370bde1027a1cd5acba
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1731x673
quality: built-in-default
format: jpeg
candidate_count: 3
generation_budget_status: WITHIN-CAP
exact_text:
  - "Active Goal"
  - "Interrupt request"
  - "Goal paused"
  - "No achievement record"
  - "Goal retained"
relation_contract:
  - "An Interrupt request pauses an active Goal."
  - "Interrupt creates no Goal-achievement record."
  - "The Goal itself remains retained."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Interrupting an active Goal pauses pursuit, retains the Goal, and creates no achievement record."
extended_description: "An Interrupt request pauses an active Goal. Interrupt creates no Goal-achievement record, and the Goal itself remains retained."
---

# ch-18-extra-01

Explanatory job: Show the failure boundary between interruption and achievement.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: An Interrupt request pauses an active Goal. Interrupt creates no Goal-achievement record, and the Goal itself remains retained.

Revision history: Run 3 used three built-in imagegen outputs. Review rejected the earlier layouts
because the two interruption outcomes were disconnected. Candidate 3 draws explicit outcome branches
from Goal paused and passed full-resolution text, relationship, forbidden-family, and K-037 review.
