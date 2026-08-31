---
kind: generated-explanatory-visual
canonical_slot: ch-26-secondary
anchor_id: null
chapter: 26
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-26-secondary.jpg
sha256: c70189e7178ac66eb26bc194b0173df960720c18edf9e0d7eabb8d0fd0faba77
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1894x265
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Close tab"
  - "Stop PTY"
  - "Terminate tree"
  - "Record exit"
  - "Release session"
relation_contract:
  - "Closing a terminal stops its PTY, terminates the process tree, records exit, and releases the session."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A five-stage terminal shutdown sequence proceeds from closing the tab through process-tree termination to releasing the session."
extended_description: "Closing a terminal stops its PTY, terminates the process tree, records exit, and releases the session."
---

# ch-26-secondary

Explanatory job: Closing a terminal stops its PTY, terminates the process tree, records exit, and releases the session.

Reviewed sources: `apps/server/src/terminal/Layers/Manager.ts`; `apps/server/src/serverShutdown.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Closing a terminal stops its PTY, terminates the process tree, records exit, and releases the session.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
