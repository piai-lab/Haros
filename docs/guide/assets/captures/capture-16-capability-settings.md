---
kind: real-product-capture
capture_id: capture-16-capability-settings
chapter: 41
file: capture-16-capability-settings.png
sha256: 553cb99f3b5b9764f1658dc8e90edfa02b2928dfa3fb660ea741a07e29e09f89
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

# Capability settings capture

Actual components: `BuiltInToolsSettingsPanel`, `I18nProvider`, `QueryClientProvider`, and
production CSS. Synthetic state: six server-owned capability group projections across Agent,
Chat, and Studio, including bounded degraded and unavailable examples.

Caption: The real capability matrix renders a server-owned projection by product surface; a switch
does not itself grant exact-Turn authority or prove a native implementation exists.

Alt text: Haros Built-in tools Settings shows Tasks, Diagnostics, Goals, Automations, Browser, and
Device across Agent, Chat, and Studio.
