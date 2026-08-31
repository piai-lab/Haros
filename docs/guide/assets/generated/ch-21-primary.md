---
kind: generated-explanatory-visual
canonical_slot: ch-21-primary
anchor_id: null
chapter: 21
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-21-primary.jpg
sha256: d787fd58c6922dbe1c3c783cd94ea801861646e8cc8f3445e7fb3eb0173ab124
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1660x502
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Local image"
  - "Validate"
  - "Normalize on device"
  - "Engine-safe attachment"
  - "Local preview"
  - "Separate grant"
relation_contract:
  - "A local image is validated and normalized on device before becoming an Engine-safe attachment."
  - "Local preview uses a separate grant."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A local image passes validation and on-device normalization, while local preview remains a separate grant."
extended_description: "The main image path is Local image, Validate, Normalize on device, Engine-safe attachment. A separate lower path connects Local preview to Separate grant."
---

# ch-21-primary

Explanatory job: Teach image intake and preview as separate capability paths.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/persistence/Layers/ManagedAttachments.ts`; `apps/web/src/components/chat/useComposerAttachmentController.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The main image path is Local image, Validate, Normalize on device, Engine-safe attachment. A separate lower path connects Local preview to Separate grant.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
