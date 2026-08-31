---
kind: generated-explanatory-visual
canonical_slot: ch-06-primary
anchor_id: G06
chapter: 6
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-06-primary.jpg
sha256: 63c642a1411054dcd53f6be97033cb112eef57cfc2e6c2cf5e248415d62bc7f4
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1774x873
quality: built-in-default
format: jpeg
candidate_epoch: K-045-rework
historical_candidate_count_before_rework: 1
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Local HostGateway execution"
  - "Connected service execution"
  - "User decision"
  - "Haros coordination"
  - "Execution owner"
  - "Recorded result"
  - "Project file"
  - "Choose workspace + bounded path"
  - "Admit file request in Product Turn"
  - "File service owner"
  - "Read or edit receipt"
  - "Local capability"
  - "Approve exact tool action"
  - "Bind request to active Turn"
  - "Capability owner"
  - "Outcome receipt"
  - "Connected service"
  - "Choose Engine or service + bounded context"
  - "Admit outward request; retain product state"
  - "Engine or service contract"
  - "Visible result or failure"
relation_contract:
  - "Project-file and local-capability actions are inside the Local HostGateway execution band."
  - "A project-file request is admitted in a Product Turn, authorized to the file-service owner, and returns a read or edit receipt."
  - "A local-capability request binds to the active Turn, is authorized to the capability owner, and returns an outcome receipt."
  - "Connected-service execution is a separate band whose execution owner is an Engine or service contract, never HostGateway."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Two separate responsibility bands place project files and local capabilities under Local HostGateway execution and connected services under a distinct execution owner."
extended_description: "In the Local HostGateway execution band, a project-file request starts with a chosen workspace and bounded path, is admitted in a Product Turn, reaches the file-service owner, and returns a read or edit receipt. A local-capability request requires approval, binds to the active Turn, reaches the capability owner, and returns an outcome receipt. In the separate Connected service execution band, Haros admits an outward request while retaining product state, but the execution owner is an Engine or service contract, never HostGateway."
---

# Chapter 6 primary figure

Explanatory job: separate local HostGateway execution from connected-service execution while showing
the decision, coordination, owner, and recorded-result responsibilities in each row.

Reviewed sources: `README.md#what-the-harness-os-owns`; `docs/architecture.md#state-boundaries`;
`docs/architecture.md#hostgateway`.

Final prompt contract: two visibly separate warm-white responsibility bands. The top band contains
only Project file and Local capability rows under Local HostGateway execution. The bottom band
contains only Connected service under Connected service execution. No shared HostGateway column,
icons, arrows, physical objects, or unrequested text.

Accessible equivalent: In the Local HostGateway execution band, a project-file request starts with a chosen workspace and bounded path, is admitted in a Product Turn, reaches the file-service owner, and returns a read or edit receipt. A local-capability request requires approval, binds to the active Turn, reaches the capability owner, and returns an outcome receipt. In the separate Connected service execution band, Haros admits an outward request while retaining product state, but the execution owner is an Engine or service contract, never HostGateway.

Revision history: K-045 Judge rework used one built-in imagegen output and stopped on PASS. The
accepted JPEG passed full-resolution text, relation, forbidden-family, and K-037 crop review.
