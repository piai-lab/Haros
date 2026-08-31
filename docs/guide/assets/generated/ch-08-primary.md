---
kind: generated-explanatory-visual
canonical_slot: ch-08-primary
anchor_id: G08
chapter: 8
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-08-primary.jpg
sha256: 1018842ad8ba8ddb1ba9e8cd784dc79c1e2c251a0352d73239c4a8091e08ae11
model: gpt-image-2
generation_tool: gpt-image-2
size: 1504x950
quality: medium
format: jpeg
candidate_count: 3
generation_budget_status: EXHAUSTED
exact_text:
  - "Agent"
  - "Project kind: project"
  - "Workspace owner: user-chosen root"
  - "Intended result: project work"
  - "Chat"
  - "Project kind: chat"
  - "Workspace owner: Haros-managed root"
  - "Intended result: conversation"
  - "Studio"
  - "Project kind: studio"
  - "Workspace owner: managed artifact root"
  - "Intended result: captured outputs"
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
  - "The project kind maps to a user-chosen Agent root, Haros-managed Chat root, or managed Studio artifact root."
  - "Their result boundaries remain distinct."
alt_text: "A three-column ownership matrix compares Agent, Chat, and Studio workspace contracts."
extended_description: "The project kind maps to a user-chosen Agent root, Haros-managed Chat root, or managed Studio artifact root. Their result boundaries remain distinct."
---

# ch-08-primary

Explanatory job: Compare three Project kinds, workspace owners, and result boundaries without implying shared files.

Reviewed source anchors:

- `packages/contracts/src/project.ts#ProjectKind`
- `packages/contracts/src/orchestration.ts#OrchestrationProject`
- `packages/shared/src/productSurface.ts`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: The project kind maps to a user-chosen Agent root, Haros-managed Chat root, or managed Studio artifact root. Their result boundaries remain distinct.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
