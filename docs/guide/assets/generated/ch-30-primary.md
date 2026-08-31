---
kind: generated-explanatory-visual
canonical_slot: ch-30-primary
anchor_id: null
chapter: 30
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-30-primary.jpg
sha256: 8cdcbb23c1e249941c0c3f1d7543381c1e0931ba7ad79544df2776f0f9864741
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1504x910
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Interactive browser"
  - "Agent web search"
  - "External network"
  - "Browser host"
  - "Web access"
  - "Service policy"
  - "Separate paths"
relation_contract:
  - "Interactive browsing, agent web search, and external network access are separate paths with separate owners and policies."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "Three columns map interactive browser, agent web search, and external network access to distinct execution owners."
extended_description: "Interactive browsing, agent web search, and external network access are separate paths with separate owners and policies."
---

# ch-30-primary

Explanatory job: Interactive browsing, agent web search, and external network access are separate paths with separate owners and policies.

Reviewed sources: `apps/server/src/browserAutomation/Layers/BrowserAutomationHost.ts`; `packages/oa-web-access/README.md`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Interactive browsing, agent web search, and external network access are separate paths with separate owners and policies.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
