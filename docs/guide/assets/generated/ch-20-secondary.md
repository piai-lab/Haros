---
kind: generated-explanatory-visual
canonical_slot: ch-20-secondary
anchor_id: null
chapter: 20
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-20-secondary.jpg
sha256: f82f32b26e66d9b3179dd4d9294820f8fc275134e0c78bff615a4969bc7f6d32
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1625x691
quality: built-in-default
format: jpeg
candidate_count: 1
generation_budget_status: WITHIN-CAP
exact_text:
  - "Reference context"
  - "Skill instruction"
  - "Engine request"
  - "HostGateway authorization"
  - "Tool receipt"
  - "Reference is not authority"
relation_contract:
  - "References and Skills shape Engine context."
  - "Local execution still requires HostGateway authorization."
  - "A receipt records the tool outcome; a reference is not authority."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Reference context and skill instructions lead to an Engine request, but HostGateway authorization governs execution."
extended_description: "References and Skills shape Engine context and converge on an Engine request. Local execution still requires HostGateway authorization, and a Tool receipt records the outcome; a reference is not authority."
---

# ch-20-secondary

Explanatory job: Separate contextual reference from execution authority.

Reviewed sources: `docs/architecture.md`; `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/Layers/EngineCommandReactor.skillMentions.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: References and Skills shape Engine context and converge on an Engine request. Local execution still requires HostGateway authorization, and a Tool receipt records the outcome; a reference is not authority.

Revision history: generated with the built-in imagegen path, accepted after candidate 1,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
