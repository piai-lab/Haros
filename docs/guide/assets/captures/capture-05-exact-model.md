---
kind: real-product-capture
capture_id: capture-05-exact-model
chapter: 11
file: capture-05-exact-model.png
sha256: e53862e6edb8be9d9b6f5bb519310f44a70c740ca704dc03b0d730bd2e2a1b8f
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 760x560
frame_dimensions: 760x560
theme: light
locale: en
fixture: apps/web/src/components/GuidebookRun2.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-run2-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Exact model capture

Actual components: `EngineModelPicker`, `ModelIdentityIcon`, menu primitives, `I18nProvider`, and
production CSS. Synthetic state: the Engine is locked to Codex and an authoritative two-model
catalog exposes exact model slugs and labels.

Caption: The real model picker selects an exact model inside the already selected Engine.

Alt text: The Haros model picker is open for Codex with GPT-5.4 selected and GPT-5.4 mini available
as a separate exact model choice.
