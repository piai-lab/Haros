---
kind: generated-explanatory-visual
canonical_slot: ch-03-secondary
anchor_id: null
chapter: 3
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-03-secondary.jpg
sha256: 52f9be89b80a9371c6bd4779714aca0c716072e43a9c3fe650d6a77b96da97c7
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1689x879
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 2
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Surface"
  - "Workspace owner"
  - "Working boundary"
  - "Durable product fact"
  - "Not implied"
  - "Agent"
  - "User"
  - "User-chosen folder"
  - "Product Thread persists"
  - "Ambient file authority"
  - "Chat"
  - "Haros"
  - "Haros-managed workspace"
  - "Disposable conversation"
  - "Studio"
  - "Isolated workspace + outputs"
  - "Every file is an output"
  - "Shared: Thread · Queue · Timeline · Recovery"
relation_contract:
  - "Agent uses a user-owned, user-chosen folder; this does not imply ambient file authority."
  - "Chat uses a Haros-managed workspace; its Product Thread persists and the conversation is not disposable."
  - "Studio uses a Haros-managed isolated workspace plus outputs; not every file is automatically an output."
  - "Thread, Queue, Timeline, and Recovery are shared product facts without merging workspace boundaries."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A workspace-boundary matrix contrasts Agent, Chat, and Studio ownership, durable Product Threads, and facts each surface does not imply."
extended_description: "Agent uses a user-owned, user-chosen folder without granting ambient file authority. Chat uses a Haros-managed workspace and its Product Thread persists, so the conversation is not disposable. Studio uses a Haros-managed isolated workspace plus outputs, but not every file automatically becomes an output. Thread, Queue, Timeline, and Recovery remain shared product facts without merging the three workspace boundaries."
---

# Chapter 3 secondary figure

Explanatory job: distinguish workspace ownership and boundaries from shared product durability and
common false implications.

Reviewed sources: `README.md`; `packages/shared/src/productSurface.ts`;
`packages/shared/src/projectContainers.ts`; `docs/architecture.md#state-boundaries`.

Final prompt contract: a warm-white five-column workspace-boundary matrix with one row per surface
and one separate shared-facts band. No icons, fake UI, physical objects, or unlabeled glyphs.

Accessible equivalent: Agent uses a user-owned, user-chosen folder without granting ambient file authority. Chat uses a Haros-managed workspace and its Product Thread persists, so the conversation is not disposable. Studio uses a Haros-managed isolated workspace plus outputs, but not every file automatically becomes an output. Thread, Queue, Timeline, and Recovery remain shared product facts without merging the three workspace boundaries.

Revision history: K-045 Judge rework used one built-in imagegen output and stopped on PASS. The
accepted JPEG passed full-resolution text, relation, forbidden-family, and K-037 crop review.
