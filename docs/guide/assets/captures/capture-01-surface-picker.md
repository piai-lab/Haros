---
kind: real-product-capture
capture_id: capture-01-surface-picker
chapter: 3
file: capture-01-surface-picker.png
sha256: 4eb94b62d933d47a78f551731fdbc61df97bfad391e2bfbfd2989505d3307a98
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 1100x760
frame_dimensions: 683x436
theme: light
locale: en
fixture: apps/web/src/components/GuidebookPilot.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Surface picker capture

Actual components: `SidebarSurfacePicker`, menu primitives, `I18nProvider`, and production CSS.
Synthetic state: Agent selected; Agent, Chat, and Studio available. The capture proves current picker
geometry and English descriptions only.

Caption: The real surface picker shows three workspace choices inside one Haros product.

Alt text: The Haros surface menu is open with Agent selected and with Chat and Studio listed below,
each accompanied by a short workspace description.
