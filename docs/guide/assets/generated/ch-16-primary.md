---
kind: generated-explanatory-visual
canonical_slot: ch-16-primary
anchor_id: null
chapter: 16
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-16-primary.jpg
sha256: e186a10fc81fc5c49c07cbf50102e98853c3160633b471406ff9e7e5905acf57
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1441x948
quality: built-in-default
format: jpeg
candidate_count: 2
generation_budget_status: WITHIN-CAP
exact_text:
  - "Project owner"
  - "Thread"
  - "Group: Research"
  - "Group: Launch"
  - "Membership only"
  - "Project unchanged"
relation_contract:
  - "The Project owner boundary contains the Thread."
  - "Two Groups remain outside the Project boundary and connect to the Thread only through membership."
  - "Project ownership remains unchanged."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A Thread stays inside its Project while two external Groups connect by membership only."
extended_description: "The Project owner boundary contains one Thread. Group: Research and Group: Launch remain outside the Project boundary and connect to the Thread only through membership. Project ownership remains unchanged."
---

# ch-16-primary

Explanatory job: Show Groups as membership overlays rather than Project containers.

Reviewed sources: `packages/contracts/src/orchestration.ts`; `apps/server/src/orchestration/conversationGroups.test.ts`

Final prompt contract: a white-background, text-first technical diagram using only the declared
exact-text inventory. Every boundary and relation maps to a reviewed source fact. People, rooms,
fake UI, physical metaphors, icons, unlabeled glyphs, logos, watermarks, and extra text are absent.

Accessible equivalent: The Project owner boundary contains one Thread. Group: Research and Group: Launch remain outside the Project boundary and connect to the Thread only through membership. Project ownership remains unchanged.

Revision history: generated with the built-in imagegen path, accepted after candidate 2,
reviewed at full resolution, converted to JPEG, and passed the K-037 deterministic crop rule.
