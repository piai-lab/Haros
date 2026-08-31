---
kind: real-product-capture
capture_id: capture-03-steering-marker
chapter: 14
file: capture-03-steering-marker.png
sha256: a5752dfdb96d139e52a424aa649e926e1263c4242dfcab6a8460826ec2dad382
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 1100x760
frame_dimensions: 872x459
theme: light
locale: en
fixture: apps/web/src/components/GuidebookPilot.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Steering marker capture

Actual components: `MessagesTimeline`, user and assistant message rows, steering provenance marker,
and production CSS. Synthetic state: one steered user message and one settled assistant response.

Caption: The Timeline labels a message that steered the active conversation.

Alt text: A Haros timeline shows “Steering conversation” above a user message, followed by a Haros
assistant response that says it changed course at the next safe boundary.
