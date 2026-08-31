---
kind: generated-explanatory-visual
canonical_slot: ch-24-secondary
anchor_id: null
chapter: 24
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-24-secondary.jpg
sha256: 69d6338207ee08a0d5e248c19528fe225ae5ee9e81267017153803f6121a6fb3
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1710x525
quality: built-in-default
format: jpeg
candidate_count: 3
generation_budget_status: WITHIN-CAP
exact_text:
  - "Source Thread"
  - "Stop first"
  - "Target Thread"
  - "Separate workspace"
  - "Branch metadata"
  - "Worktree path"
relation_contract:
  - "The source Thread stops before the target Thread takes over."
  - "The target Thread owns explicit branch and worktree metadata inside a separate workspace."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A stop-first handoff creates one Target Thread bound to branch metadata and a separate worktree path."
extended_description: "The source Thread stops first before the target Thread takes over. Inside a separate workspace, the target Thread owns explicit Branch metadata and Worktree path metadata."
---

# ch-24-secondary

Explanatory job: Separate handoff lifecycle from Git worktree metadata.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/decider.worktreeMetadata.test.ts`; `apps/web/src/components/chat/MessagesTimeline.worktreeSetup.browser.tsx`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The source Thread stops first before the target Thread takes over. Inside a separate workspace, the target Thread owns explicit Branch metadata and Worktree path metadata.

Revision history: Run 3 used three built-in imagegen outputs. Earlier candidates did not make the
stop-first direction explicit. Candidate 3 uses arrowheads from Source Thread through Stop first
into one Target Thread and keeps workspace, branch, and worktree facts inside that target boundary;
it passed full-resolution text, relationship, forbidden-family, natural-case, and K-037 review.
