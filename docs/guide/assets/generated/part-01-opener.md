---
kind: generated-explanatory-visual
canonical_slot: part-01-opener
anchor_id: null
chapter: null
visual_family: haros-technical-editorial-diagram
style_master: true
file: part-01-opener.jpg
sha256: bacfa429b8a9ec633f165ec42bfdbc8ff383798441e17483eb02e9817925960d
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1693x929
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 4
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Agent"
  - "Chat"
  - "Studio"
  - "Best for"
  - "Project work"
  - "Focused conversation"
  - "Artifact creation"
  - "Workspace"
  - "User-chosen folder"
  - "Haros-managed workspace"
  - "Isolated workspace"
  - "Durable work"
  - "Product Thread"
  - "Output"
  - "Repository changes"
  - "Conversation"
  - "Deliverables"
  - "Shared product state"
  - "Thread"
  - "Queue"
  - "Timeline"
  - "Recovery"
relation_contract:
  - "Agent maps project work to a user-chosen folder and repository changes."
  - "Chat maps focused conversation to a Haros-managed workspace and a conversation."
  - "Studio maps artifact creation to an isolated workspace and deliverables."
  - "Thread, Queue, Timeline, and Recovery are shared product-state facts across all three surfaces."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A technical matrix compares Agent, Chat, and Studio workspaces and outputs above one shared Haros product-state band."
extended_description: "Agent supports project work in a user-chosen folder and produces repository changes. Chat supports focused conversation in a Haros-managed workspace. Studio supports artifact creation in an isolated workspace and produces deliverables. Each surface keeps a Product Thread, while Thread, Queue, Timeline, and Recovery remain shared Haros product facts rather than one shared filesystem or native Session."
---

# Part I opener

Explanatory job: orient a newcomer to three different work-surface boundaries without claiming a
shared filesystem or native Engine Session continuity.

Reviewed sources: `README.md#three-ways-into-the-harness-os`;
`docs/architecture.md#product-orchestration`; `packages/shared/src/productSurface.ts`.

Final prompt contract: a warm-white, text-only technical matrix with one column per surface, four
comparison rows, and one full-width shared-product-state band. No icons, fake UI, physical objects,
or unlabeled glyphs.

Accessible equivalent: Agent supports project work in a user-chosen folder and produces repository changes. Chat supports focused conversation in a Haros-managed workspace. Studio supports artifact creation in an isolated workspace and produces deliverables. Each surface keeps a Product Thread, while Thread, Queue, Timeline, and Recovery remain shared Haros product facts rather than one shared filesystem or native Session.

Revision history: K-045 Judge rework used one built-in imagegen output and stopped on PASS. The
accepted JPEG passed full-resolution text, relation, forbidden-family, and K-037 crop review.
