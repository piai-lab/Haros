---
kind: generated-explanatory-visual
canonical_slot: ch-26-primary
anchor_id: null
chapter: 26
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-26-primary.jpg
sha256: 835dc56a44ea0605dc2adfdd9db461f24f24eb91767885d9dd437ee57aca4f1f
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x886
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Project"
  - "Terminal manager"
  - "PTY session"
  - "Process"
  - "Output stream"
  - "Exit state"
relation_contract:
  - "A Project contains a Terminal manager, PTY session, and process; output and exit state are separate projections."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Nested ownership bands place a process inside a PTY session, Terminal manager, and Project, with separate output and exit branches."
extended_description: "A Project contains a Terminal manager, PTY session, and process; output and exit state are separate projections."
---

# ch-26-primary

Explanatory job: A Project contains a Terminal manager, PTY session, and process; output and exit state are separate projections.

Reviewed sources: `packages/contracts/src/terminal.ts`; `apps/server/src/terminal/Layers/Manager.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: A Project contains a Terminal manager, PTY session, and process; output and exit state are separate projections.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
