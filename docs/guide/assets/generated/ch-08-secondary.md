---
kind: generated-explanatory-visual
canonical_slot: ch-08-secondary
anchor_id: null
chapter: 8
visual_family: haros-grounded-editorial-anatomy
style_master: false
file: ch-08-secondary.jpg
sha256: 25054f7d2ca6bd3d5453ec3d0c60732ca4af9b1d0283d7da591d539f90d70110
model: gpt-image-2
generation_tool: gpt-image-2
size: 1486x988
quality: medium
format: jpeg
candidate_count: 3
generation_budget_status: EXHAUSTED
exact_text:
  - "Product creation step"
  - "Resolved product fact"
  - "Create Project"
  - "Project identity"
  - "Resolve Project kind"
  - "Surface lifecycle"
  - "Resolve workspace root"
  - "Recorded workspace owner"
  - "Create Product Thread"
  - "Durable Thread identity"
  - "Recovery question"
  - "Authoritative answer"
  - "Which workspace?"
  - "Resolve recorded owner"
  - "Which history?"
  - "Product Orchestration"
  - "No file merge"
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
  - "Project creation resolves kind and workspace root before creating a Product Thread."
  - "Workspace ownership stays with its recorded owner; durable Thread state stays with Product Orchestration; recovery does not merge files."
alt_text: "A two-section matrix separates Project creation facts from recovery questions."
extended_description: "Project creation resolves kind and workspace root before creating a Product Thread. Workspace ownership stays with its recorded owner; durable Thread state stays with Product Orchestration; recovery does not merge files."
---

# ch-08-secondary

Explanatory job: Separate Project creation, workspace ownership, durable Thread state, and recovery.

Reviewed source anchors:

- `packages/contracts/src/orchestration.ts#OrchestrationProject`
- `docs/architecture.md#product-orchestration`

Allowed abstraction: labeled rectangles, explicit boundaries, matrices, and source-backed directional relations.

Forbidden: people, rooms, desks, physical or toy metaphors, gears, gates, shields, fake UI, dashboards, code, logos, unlabeled nodes, ambiguous arrows, and unrequested text.

Final prompt contract: render the explanatory job above as a white-background, label-first technical editorial diagram using only the declared exact-text inventory; every node and arrow must map to a reviewed source fact. Generated with `gpt-image-2`, medium quality, 1536×1024 JPEG.

Accessible equivalent: Project creation resolves kind and workspace root before creating a Product Thread. Workspace ownership stays with its recorded owner; durable Thread state stays with Product Orchestration; recovery does not merge files.

Revision history: Rendered-output accounting is recorded in `missions/haros-guidebook.md`; the current raster passed full-resolution Executor truth, text, style, and crop audit.
