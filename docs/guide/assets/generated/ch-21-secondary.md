---
kind: generated-explanatory-visual
canonical_slot: ch-21-secondary
anchor_id: null
chapter: 21
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-21-secondary.jpg
sha256: 62c512fd76a97254dccd2e18412539dd3a50f481d31f2da1a66efc30799d09ed
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1688x255
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Record"
  - "Upload"
  - "Transcribe"
  - "Text draft"
  - "Review"
  - "Send"
relation_contract:
  - "Voice recording is uploaded for transcription."
  - "Transcription yields an editable text draft."
  - "Only Send admits the reviewed text as work."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Voice intake moves from recording through transcription and review before Send."
extended_description: "A voice recording is uploaded for transcription, and transcription yields an editable text draft. Review follows, and only Send admits the reviewed text as work."
---

# ch-21-secondary

Explanatory job: Explain the voice-to-text admission boundary.

Reviewed sources: `apps/web/src/components/chat/useComposerVoiceController.ts`; `apps/web/src/components/chat/ComposerVoiceRecorderBar.tsx`; `packages/contracts/src/orchestration.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: A voice recording is uploaded for transcription, and transcription yields an editable text draft. Review follows, and only Send admits the reviewed text as work.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
