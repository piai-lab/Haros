---
kind: real-product-capture
capture_id: capture-08-subagent-lineage
chapter: 22
file: capture-08-subagent-lineage.png
sha256: a5f37d3fe5d3ef2f5c2b7f7b1e516eb45f254cc9af8329431e489170841ad5bf
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 760x560
frame_dimensions: 680x480
theme: light
locale: en
fixture: apps/web/src/components/GuidebookRun3.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-run3-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Subagent lineage capture

Actual components: `ComposerColumnFrame`, `ComposerSubagentStrip`, its production row and status
presenters, `I18nProvider`, and production CSS. Synthetic state: one visible parent task, one running
research subagent, and one completed review subagent; no agent is actually spawned or stopped.

Caption: The real subagent strip preserves a visible route back to the parent and reports each
child's separate status instead of flattening their responsibility.

Alt text: A Haros subagent strip shows Back to main task above Source review marked Running and
Contract check marked Completed.
