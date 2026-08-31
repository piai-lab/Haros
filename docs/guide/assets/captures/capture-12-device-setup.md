---
kind: real-product-capture
capture_id: capture-12-device-setup
chapter: 31
file: capture-12-device-setup.png
sha256: 7fccbf8df621244c5f9c5e84a115a9e2cef51a3066d954af6f60ed1cec344e12
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 760x620
frame_dimensions: 680x576
theme: light
locale: en
fixture: apps/web/src/components/GuidebookRun3.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-run3-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Device setup capture

Actual components: `DeviceScreen`, `DeviceFrame`, `DeviceSetupScreen`, `I18nProvider`, and
production CSS. Synthetic state: two completed local prerequisites and two incomplete ones; no real
device is discovered, booted, captured, or sent an action.

Caption: The production setup surface shows availability prerequisites before device actions; even
successful discovery would not itself grant approval-sensitive action authority.

Alt text: A Haros device frame shows Finish device setup with Install Xcode and Accept the Xcode
license complete, while installing a runtime and building the helper remain incomplete.
