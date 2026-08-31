---
kind: real-product-capture
capture_id: capture-02-queued-follow-up
chapter: 14
file: capture-02-queued-follow-up.png
sha256: 2435e54f1ff76c68855ba7c293f0274a96958a4ab290da07fbf9f2216a4c2105
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 1100x760
frame_dimensions: 872x436
theme: light
locale: en
fixture: apps/web/src/components/GuidebookPilot.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Queued follow-up capture

Actual components: `ComposerQueuedHeader`, `QueuedComposerActions`, `ChatMarkdown`, composer panel
primitives, and production CSS. Synthetic state: one queued prompt bound to synthetic Codex/gpt-5
selection under `/synthetic/haros-guidebook`. The surrounding explanatory frame is a fixture; the
queued row and its controls are production components.

Caption: A queued follow-up remains visible and offers an explicit Steer action while a turn runs.

Alt text: Above a Haros composer, a queued row reads “Run the focused tests after the current
analysis finishes” and includes Steer, delete, and more-actions controls.
