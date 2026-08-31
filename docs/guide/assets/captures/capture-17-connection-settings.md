---
kind: real-product-capture
capture_id: capture-17-connection-settings
chapter: 46
file: capture-17-connection-settings.png
sha256: 5acf800957d76efb00999449739ff63dcfc17c124a8ace373397e33291f8142a
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

# Connection settings capture

Actual components: `ExternalConnectionsSettingsPanel`, `I18nProvider`, `QueryClientProvider`, and
production CSS. Synthetic state: two Haros-owned placeholder Projects and one paired documentation
assistant with explicit read/create/wait permissions; no endpoint, token, account, or real path.

Caption: The real connection review exposes explicit project scope and typed permissions while
keeping credentials and private endpoints outside the UI projection.

Alt text: Haros External connections Settings reviews a synthetic documentation assistant, two
placeholder Projects, and explicit task permissions without displaying a credential.
