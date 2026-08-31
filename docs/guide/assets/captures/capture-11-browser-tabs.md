---
kind: real-product-capture
capture_id: capture-11-browser-tabs
chapter: 30
file: capture-11-browser-tabs.png
sha256: d07dce06b594a4cfb8f5b9218e65739deb9602ed66ecbf8a8415ad7d0d8c7108
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

# Browser tabs capture

Actual components: `BrowserTabStrip`, production browser tab and status controls,
`I18nProvider`, and production CSS. Synthetic state: a loopback local-preview tab and a reserved
invalid-domain reference tab; no network request, page navigation, or browser runtime is created.

Caption: The real browser tab strip exposes thread-local interactive browser state; it is not proof
that agent web search or arbitrary external network access follows the same authority path.

Alt text: A Haros browser tab strip shows Haros local preview selected, API reference beside it, a
New tab control, and a Local server status label.
