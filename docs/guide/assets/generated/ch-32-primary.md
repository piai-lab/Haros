---
kind: generated-explanatory-visual
canonical_slot: ch-32-primary
anchor_id: null
chapter: 32
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-32-primary.jpg
sha256: b62fc281627399562af730976a374319091d737736cad2ee4b482da7889799eb
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1553x702
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Discovered script"
  - "Project action"
  - "Process manager"
  - "Background process"
  - "Push event"
  - "Cancel"
relation_contract:
  - "A discovered script becomes a Project action whose background process lifecycle, events, and cancellation remain owned by the process manager."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A project-action flow connects script discovery to process-manager-owned background execution, push events, and cancellation."
extended_description: "A discovered script becomes a Project action whose background process lifecycle, events, and cancellation remain owned by the process manager."
---

# ch-32-primary

Explanatory job: A discovered script becomes a Project action whose background process lifecycle, events, and cancellation remain owned by the process manager.

Reviewed sources: `packages/contracts/src/project.ts`; `apps/server/src/devServerManager.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: A discovered script becomes a Project action whose background process lifecycle, events, and cancellation remain owned by the process manager.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
