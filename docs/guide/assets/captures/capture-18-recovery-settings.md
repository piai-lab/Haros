---
kind: real-product-capture
capture_id: capture-18-recovery-settings
chapter: 45
file: capture-18-recovery-settings.png
sha256: ce24df22e1eed37db5cfe0dcd51e89627b35cc68446ae0730b9eebc3540e68dc
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 1440x900
frame_dimensions: 928x512
theme: light
locale: en
fixture: apps/web/src/components/GuidebookRun4.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-run4-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Recovery settings capture

Actual components: `AdvancedSettingsPanel`, `I18nProvider`, `QueryClientProvider`, and production
CSS. Synthetic state: recovery is eligible, no authentication session is active, the explanation is
expanded, and all visible paths are Haros-owned placeholders.

Caption: The real Recovery tools surface explains a bounded index repair and keeps the action
separate from destructive chat clearing or private Engine-state manipulation.

Alt text: Haros Advanced Settings shows an expanded Recovery tools explanation and an enabled
Repair state action using sanitized synthetic state.
