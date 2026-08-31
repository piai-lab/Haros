---
kind: generated-explanatory-visual
canonical_slot: ch-03-primary
anchor_id: G03
chapter: 3
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-03-primary.jpg
sha256: 756d7aca8c6ed547b58ee426c84ffebe4165b47ce867beb42a58b659dbdd7461
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1692x899
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 3
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Job"
  - "Choose"
  - "Workspace boundary"
  - "Shared owner"
  - "Project work"
  - "Agent"
  - "User-chosen folder"
  - "Focused conversation"
  - "Chat"
  - "Haros-managed workspace"
  - "Artifact outputs"
  - "Studio"
  - "Isolated workspace + outputs"
  - "One product"
  - "Thread · Queue · Timeline · Recovery"
relation_contract:
  - "Project work maps to Agent and a user-chosen folder."
  - "Focused conversation maps to Chat and a Haros-managed workspace."
  - "Artifact outputs map to Studio and an isolated workspace plus outputs."
  - "All three rows share one Haros product owner for Thread, Queue, Timeline, and Recovery."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A decision matrix maps project work to Agent, focused conversation to Chat, and artifact outputs to Studio, all under one shared product owner."
extended_description: "Project work maps to Agent and a user-chosen folder. Focused conversation maps to Chat and a Haros-managed workspace. Artifact outputs map to Studio and an isolated workspace plus outputs. The three rows remain distinct workspace choices but share one Haros product owner for Thread, Queue, Timeline, and Recovery."
---

# Chapter 3 primary figure

Explanatory job: map each job shape to the appropriate Haros surface and truthful workspace boundary
while preserving one product owner.

Reviewed sources: `README.md#three-ways-into-the-harness-os`;
`docs/architecture.md#product-orchestration`; `packages/shared/src/productSurface.ts`.

Final prompt contract: a warm-white four-column decision matrix with three source-backed job rows and
one vertically merged shared-owner cell. No icons, fake UI, physical objects, or unlabeled glyphs.

Accessible equivalent: Project work maps to Agent and a user-chosen folder. Focused conversation maps to Chat and a Haros-managed workspace. Artifact outputs map to Studio and an isolated workspace plus outputs. The three rows remain distinct workspace choices but share one Haros product owner for Thread, Queue, Timeline, and Recovery.

Revision history: K-045 Judge rework used one built-in imagegen output and stopped on PASS. The
accepted JPEG passed full-resolution text, relation, forbidden-family, and K-037 crop review.
