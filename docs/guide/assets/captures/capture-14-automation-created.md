---
kind: real-product-capture
capture_id: capture-14-automation-created
chapter: 34
file: capture-14-automation-created.png
sha256: eac6662fdb7644cbf9204e7cad3ee19d8362ec3882052216d5e661d31a31d170
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

# Automation created capture

Actual components: `AutomationCreatedCard`, `I18nProvider`, `QueryClientProvider`, and production
CSS. Synthetic state: an already accepted weekly automation identity and cadence; no definition is
stored, scheduled, opened, or executed.

Caption: The real automation card presents an accepted definition and cadence as product state;
the card alone says nothing about a run result or the next run's permissions.

Alt text: A Haros automation card shows Weekly repository check, Every Monday at 09:00, Accepted,
and an Open action.
