---
kind: generated-explanatory-visual
canonical_slot: ch-32-secondary
anchor_id: null
chapter: 32
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-32-secondary.jpg
sha256: ef62c6e50bf4d4a6ab7edad27eade0607fbf026717250e6fb8674377e17853cb
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1516x617
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Project action"
  - "Process manager"
  - "Workbench"
  - "Repeatable command"
  - "Lifecycle owner"
  - "Status projection"
  - "Background is not detached"
relation_contract:
  - "Project actions define repeatable commands, the process manager owns lifecycle, and the Workbench only projects status."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A responsibility matrix assigns commands to Project actions, lifecycle to the process manager, and status projection to the Workbench."
extended_description: "Project actions define repeatable commands, the process manager owns lifecycle, and the Workbench only projects status."
---

# ch-32-secondary

Explanatory job: Project actions define repeatable commands, the process manager owns lifecycle, and the Workbench only projects status.

Reviewed sources: `apps/web/src/components/ProjectScriptsControl.browser.tsx`; `apps/web/src/projectRunStore.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Project actions define repeatable commands, the process manager owns lifecycle, and the Workbench only projects status.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
