---
kind: generated-explanatory-visual
canonical_slot: ch-20-primary
anchor_id: null
chapter: 20
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-20-primary.jpg
sha256: 875b33116b68cdcf6a83a742252058274ca8aeece20199c3b4105e6f6b4a4e92
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1619x805
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Prompt"
  - "Attachments"
  - "Mentions"
  - "Skills"
  - "Admitted Turn"
  - "Metadata retained"
relation_contract:
  - "Prompt, Attachments, Mentions, and Skills enter one admitted Turn."
  - "Their structured metadata is retained with the message."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Prompt, attachments, mentions, and skills form one admitted Turn context bundle."
extended_description: "Prompt, Attachments, Mentions, and Skills enter one admitted Turn on a shared context rail. Their structured metadata is retained with the Message beneath that boundary."
---

# ch-20-primary

Explanatory job: Map the admitted context bundle.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/Layers/EngineCommandReactor.skillMentions.test.ts`; `apps/web/src/components/chat/useComposerAttachmentController.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: Prompt, Attachments, Mentions, and Skills enter one admitted Turn on a shared context rail. Their structured metadata is retained with the Message beneath that boundary.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
