---
kind: generated-explanatory-visual
canonical_slot: ch-30-secondary
anchor_id: null
chapter: 30
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-30-secondary.jpg
sha256: d959c1c2e7c76b7d3ddc0f6ec88457455b881441ed05bc210bf948fde0af2f21
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1512x493
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Turn request"
  - "Browser authority"
  - "Browser host"
  - "Page result"
  - "Annotation"
relation_contract:
  - "A Turn request requires browser authority before Browser host execution; annotations derive from page results."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A browser flow passes through authority and the Browser host to a page result, from which an annotation branches."
extended_description: "A Turn request requires browser authority before Browser host execution; annotations derive from page results."
---

# ch-30-secondary

Explanatory job: A Turn request requires browser authority before Browser host execution; annotations derive from page results.

Reviewed sources: `packages/shared/src/browserAutomationCatalogue.ts`; `packages/shared/src/browserAnnotations.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: A Turn request requires browser authority before Browser host execution; annotations derive from page results.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
