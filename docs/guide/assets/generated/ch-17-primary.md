---
kind: generated-explanatory-visual
canonical_slot: ch-17-primary
anchor_id: null
chapter: 17
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-17-primary.jpg
sha256: daf201bb8771651f55a5e81666f9a827c2dfe4c45f3993109f59a0033f7402bd
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x758
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Thread notes"
  - "Whole Thread"
  - "Pinned message"
  - "Whole message"
  - "Text marker"
  - "Selected span"
relation_contract:
  - "Thread Notes have whole-Thread scope."
  - "A Pinned Message identifies a whole message."
  - "A Text Marker identifies a selected text span."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A three-column scope matrix distinguishes Thread Notes, Pinned Messages, and Text Markers."
extended_description: "Thread Notes apply to the Whole Thread. A Pinned Message points to a Whole message. A Text Marker points to a Selected span."
---

# ch-17-primary

Explanatory job: Distinguish three durable memory aids by their exact scope.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/web/src/components/chat/environment/EnvironmentNotesSection.tsx`; `apps/web/src/components/chat/environment/EnvironmentPinnedSection.tsx`; `apps/web/src/components/chat/environment/EnvironmentMarkersSection.tsx`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Thread Notes apply to the Whole Thread. A Pinned Message points to a Whole message. A Text Marker points to a Selected span.

Revision history: Run 3 used two built-in imagegen outputs. Candidate 2 normalized every generic
multiword label to natural sentence case and passed full-resolution text, relationship,
forbidden-family, and K-037 crop review.
