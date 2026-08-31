---
kind: generated-explanatory-visual
canonical_slot: ch-29-primary
anchor_id: null
chapter: 29
visual_family: haros-technical-editorial-diagram
style_master: false
file: ch-29-primary.jpg
sha256: af014dab18be614c61a668de6510d96734537ef505a1d3c01ec138677e1da60e
model: imagegen-built-in
generation_tool: built-in-imagegen
size: 1665x296
quality: built-in-default
format: jpeg
candidate_epoch: run-3-part-iv
candidate_count: 1
generation_budget_status: PASS-STOPPED-EARLY
exact_text:
  - "Working tree"
  - "Branch"
  - "Commit"
  - "Push"
  - "PR projection"
  - "Remote facts"
relation_contract:
  - "Local work becomes a remote pull-request projection only after branch, commit, and push boundaries; remote facts remain distinct."
acceptance_exact_text: PASS-full-resolution-worker-audit
acceptance_relationships: PASS-source-reviewed-worker-audit
acceptance_no_unrequested_text: PASS
capitalization_verdict: PASS
visual_truth_verdict: PASS
density_style_verdict: PASS
forbidden_family_check: PASS
crop_rule: near-white-246-bbox-plus-2pct-pad-16-to-40px
crop_verdict: PASS
alt_text: "A local-to-remote chain runs from working tree through branch, commit, and push to PR projection and remote facts."
extended_description: "Local work becomes a remote pull-request projection only after branch, commit, and push boundaries; remote facts remain distinct."
---

# ch-29-primary

Explanatory job: Local work becomes a remote pull-request projection only after branch, commit, and push boundaries; remote facts remain distinct.

Reviewed sources: `apps/server/src/git/Services/GitHubCli.ts`; `apps/server/src/pullRequests.logic.test.ts`.

Final prompt contract: white-background, label-first technical relationship diagram using only the declared exact-text inventory; no fake UI, physical metaphor, people, or unlabeled glyphs.

Accessible equivalent: Local work becomes a remote pull-request projection only after branch, commit, and push boundaries; remote facts remain distinct.

Revision history: Run 3 used 1 built-in imagegen output and stopped on the first full-resolution PASS. The accepted JPEG passed text, relationship, forbidden-family, natural-case, and K-037 crop review.
