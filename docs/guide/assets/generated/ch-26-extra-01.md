---
kind: generated-explanatory-visual
canonical_slot: ch-26-extra-01
anchor_id: null
chapter: 26
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-26-extra-01.jpg
sha256: 10cb389de985c02f9b4b4afb51698776ea92c8faee013088dc561bc16c717d10
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1626x573
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Terminal session"
  - "Normal exit"
  - "Exit state"
  - "Shutdown"
  - "Process tree"
  - "Cleanup receipt"
relation_contract:
  - "Normal exit records exit state; shutdown additionally targets the process tree and produces cleanup evidence."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A terminal session branches to normal exit and exit state or shutdown, process-tree cleanup, and a cleanup receipt."
extended_description: "Normal exit records exit state; shutdown additionally targets the process tree and produces cleanup evidence."
---

# ch-26-extra-01

Explanatory job: Normal exit records exit state; shutdown additionally targets the process tree and produces cleanup evidence.

Reviewed sources: `packages/contracts/src/terminal.ts`; `apps/server/src/effectServer.lifecycle.test.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Normal exit records exit state; shutdown additionally targets the process tree and produces cleanup evidence.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
