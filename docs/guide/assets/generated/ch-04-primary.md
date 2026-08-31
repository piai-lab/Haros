---
kind: generated-explanatory-visual
canonical_slot: ch-04-primary
anchor_id: G04
chapter: 4
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-04-primary.jpg
sha256: 1dc644f01a0665c7f8361306b32ee57c83556995132336df380492f55f3af0d3
model: gpt-image-2
generation_tool: gpt-image-2
size: 1504x926
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Ask"
  - "Queue"
  - "Run"
  - "Review"
  - "Recover"
  - "Bounded prompt"
  - "Admitted binding"
  - "Authorized tools"
  - "Diff + tests"
  - "Product settlement"
  - "User intent"
  - "Preserved follow-up"
  - "Tool receipts"
  - "Review decision"
  - "Control restored"
  - "Error or interruption"
  - "Product Thread"
  - "Timeline"
acceptance_exact_text: PASS-full-resolution-executor-audit
acceptance_relationships: PASS-executor-source-review
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
relation_contract:
  - "A complete beginner workflow asks, admits or queues the turn, runs it, reviews evidence, and recovers when needed while the Product Thread remains retained."
alt_text: "A five-stage task matrix maps Ask, Queue, Run, Review, and Recover to concrete product evidence."
extended_description: "A complete beginner workflow asks, admits or queues the turn, runs it, reviews evidence, and recovers when needed while the Product Thread remains retained."
---

# Chapter 4 primary figure

Explanatory job: provide the five-stage first-task journey without implying five universal runtime
states.

Reviewed source anchors: `packages/contracts/src/orchestration.ts#TurnDispatchMode`;
`apps/server/src/orchestration/decider.ts#thread.turn.start`; `README.md#what-the-harness-os-owns`.

Final prompt: five equal rectangles in a strict `ASK → QUEUE → RUN → REVIEW → RECOVER` sequence;
`PRODUCT THREAD RETAINED` spans below; no icons, fake UI, gears, lifebuoy, or extra text.

Settings: `gpt-image-2`, medium, 1536×1024, JPEG quality 88. Candidate 1 used prohibited objects;
candidate 2 passed full-resolution QA.

Accessible equivalent: A complete beginner workflow asks, admits or queues the turn, runs it,
reviews evidence, and recovers when needed while the Product Thread remains retained.
