---
kind: real-product-capture
capture_id: capture-15-engine-settings
chapter: 39
file: capture-15-engine-settings.png
sha256: 1c05e5e01d71ef3009022368f674ff835d5c771092c42ba7bb5aacc40bee734c
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 1440x900
frame_dimensions: 928x656
theme: light
locale: en
fixture: apps/web/src/components/GuidebookRun4.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-run4-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Engine settings capture

Actual components: `EnginesSettingsPanel`, `I18nProvider`, `QueryClientProvider`, canonical
`ENGINE_DESCRIPTORS`, and production CSS. Synthetic state: five bounded Engine status projections
with fixed checked time and Haros-owned placeholder paths; no Engine account is contacted.

Caption: The real Engine Settings panel projects descriptor-owned identity, ordering, and bounded
availability status without becoming another Engine registry.

Alt text: Haros Engine Settings shows the Engine picker and canonical Engine rows with synthetic
availability states.
