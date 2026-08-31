---
kind: generated-explanatory-visual
canonical_slot: ch-05-primary
anchor_id: G05
chapter: 5
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-05-primary.jpg
sha256: 521a1524d836aad0a246250cc1fd2c3896e83461af1fc188426201a48b09f6ce
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1528x887
quality: medium
format: jpeg
candidate_count: 2
generation_budget_status: RECORDED-IN-CANONICAL-SPEC
exact_text:
  - "Project"
  - "Product Thread"
  - "Turn"
  - "Engine"
  - "Model"
  - "Tool request"
  - "HostGateway"
  - "Tool"
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
  - "A Project supplies workspace context for Threads; a Thread contains ordered Turns; each admitted Turn binds an Engine and model; tool use remains a separately authorized capability."
alt_text: "A responsibility diagram separates Project, Product Thread, Turn, Engine, Model, HostGateway, and Tool."
extended_description: "A Project supplies workspace context for Threads; a Thread contains ordered Turns; each admitted Turn binds an Engine and model; tool use remains a separately authorized capability."
---

# Chapter 5 primary figure

Explanatory job: map the six core nouns without collapsing their owners.

Reviewed source anchors: `packages/contracts/src/project.ts#ProjectKind`;
`packages/contracts/src/orchestration.ts#OrchestrationProject`;
`packages/contracts/src/orchestration.ts#EngineSelection`; `docs/architecture.md#hostgateway`.

Accepted composition: Project contains Product Thread and ordered Turn nodes. Each Turn points to
Engine, Model remains inside Engine, and a Tool request crosses the labeled HostGateway boundary
before Tool execution. The figure uses exact labels and no decorative icons.

Generation provenance: built-in image generation at medium quality. Candidate accounting and the
accepted source provenance are recorded in front matter and the canonical Campaign spec; the
canonical raster passed full-resolution truth, text, style, and crop QA.

Accessible equivalent: A Project supplies workspace context for Threads; a Thread contains ordered
Turns; each admitted Turn binds an Engine and model; tool use remains a separately authorized
capability.
