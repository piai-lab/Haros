---
kind: generated-explanatory-visual
canonical_slot: ch-35-secondary
anchor_id: null
chapter: 35
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-35-secondary.jpg
sha256: e8768d580223e60f7bed41971d251e12df86b20d135367e4473567f5d959e07e
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1536x1024
quality: high
format: jpeg
candidate_epoch: run-4-parts-v-vi
candidate_count: 3
accepted_attempt: 3
generation_budget_status: PASS-STOPPED-AT-FIRST-ACCEPTED-OUTPUT
pre_generation_requested_text:
  - "Authorized edges"
  - "Web intent"
  - "Desktop IPC"
  - "Desktop-owned action"
  - "Server transport"
  - "Product Orchestration"
  - "HostGateway"
  - "Local capability"
exact_text:
  - "Web intent"
  - "Desktop IPC"
  - "Desktop-owned action"
  - "Server transport"
  - "Product Orchestration"
  - "HostGateway"
  - "Local capability"
relation_contract:
  - "A native-window action travels from Web to a narrow Desktop IPC handler. A product command or capability request travels from Web through typed authenticated RPC to Server. Server dispatches product intent to Product Orchestration and admitted local work through HostGateway or the real capability service. Snapshots and subscribed events return to Web. Engine native protocols and credentials remain behind Server-side adapters and are never projected into the renderer."
acceptance_exact_text: PASS-tesseract-5.5.3-raster-derived-plus-full-resolution-human-checklist
acceptance_relationships: PASS-source-reviewed-cross-QA
acceptance_no_unrequested_text: PASS-bidirectional-raster-transcript
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Authorized edges connect renderer requests to Desktop IPC or Server RPC, never directly to native execution."
extended_description: "A native-window action travels from Web to a narrow Desktop IPC handler. A product command or capability request travels from Web through typed authenticated RPC to Server. Server dispatches product intent to Product Orchestration and admitted local work through HostGateway or the real capability service. Snapshots and subscribed events return to Web. Engine native protocols and credentials remain behind Server-side adapters and are never projected into the renderer."
---

# ch-35-secondary

Explanatory job: Authorized edges connect renderer requests to Desktop IPC or Server RPC, never directly to native execution.

Reviewed sources: the chapter source anchors and the Run 4 pre-generation exact relation contract.

Pre-generation prompt contract: warm-white, charcoal/gray, muted-teal, sparse-amber technical editorial diagram; the requested text inventory is preserved in `pre_generation_requested_text`, with frozen edges; no fake UI, people, physical metaphor, decorative glyphs, or invented lifecycle.

Final raster transcript contract: `exact_text` contains only full-resolution labels observed in the accepted raster; source-supported labels visible in the raster remain even when absent from the pre-generation inventory.

Accessible equivalent: A native-window action travels from Web to a narrow Desktop IPC handler. A product command or capability request travels from Web through typed authenticated RPC to Server. Server dispatches product intent to Product Orchestration and admitted local work through HostGateway or the real capability service. Snapshots and subscribed events return to Web. Engine native protocols and credentials remain behind Server-side adapters and are never projected into the renderer.

Revision history: Run 4 used 3 rendered outputs for this slot and stopped at the first full-resolution source-aligned PASS. Rejected candidates are not canonical assets.
