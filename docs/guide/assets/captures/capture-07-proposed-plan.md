---
kind: real-product-capture
capture_id: capture-07-proposed-plan
chapter: 19
file: capture-07-proposed-plan.png
sha256: 3e29f908d4485b9ad0fe13e935403fb1a9df9fa4024ef1da1738ef752f0270fa
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

# Proposed plan capture

Actual components: `ProposedPlanCard`, `ProposedPlanActions`, `ChatMarkdown`, `I18nProvider`, and
production CSS. Synthetic state: one short plan for a queue repair in a non-existent synthetic
workspace; no plan is accepted and no implementation thread is created.

Caption: The real proposed-plan card keeps review actions attached to a visible plan before any
distinct implementation path is started.

Alt text: A Haros proposed-plan card titled Safer queue repair lists four reviewable steps and the
production plan action controls.
