---
kind: generated-explanatory-visual
canonical_slot: ch-17-secondary
anchor_id: null
chapter: 17
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-17-secondary.jpg
sha256: 019813d2b1da6167f624303c2d4622ea71991b6fde01900b023f20a1cb5a6f1c
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1913x202
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Capture"
  - "Label"
  - "Address"
  - "Remove aid"
  - "Transcript retained"
relation_contract:
  - "A memory aid can be captured, labelled, addressed, and removed."
  - "Removing the aid retains the transcript."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A memory-aid lifecycle ends with the transcript retained after the aid is removed."
extended_description: "A memory aid is captured, labelled, addressed, and removed in one directional sequence. Removing the aid retains the transcript and ends only the annotation lifecycle."
---

# ch-17-secondary

Explanatory job: Separate annotation lifecycle from transcript retention.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/Layers/pinnedMessagesRoundTrip.integration.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: A memory aid is captured, labelled, addressed, and removed in one directional sequence. Removing the aid retains the transcript and ends only the annotation lifecycle.

Revision history: Run 3 used two built-in imagegen outputs. Full-resolution review rejected the
first for seven unlabeled endpoint glyphs. Candidate 2 uses labelled rectangles and explicit arrows
only and passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
