---
kind: real-product-capture
capture_id: capture-04-engine-availability
chapter: 7
file: capture-04-engine-availability.png
sha256: 85799afb770218e8291fde0226bd82a8edbad5c373cdbee9fc10f8d67db59744
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

# Engine availability capture

Actual components: `ComposerEnginePicker`, menu primitives, `EngineIcon`, `I18nProvider`, canonical
Engine ordering, and production CSS. Synthetic state: Codex ready and selected; Claude requires sign
in; Cursor is not installed; Grok is limited; unprobed Engines remain checking.

Caption: The real Engine picker reports availability and recovery entry points instead of treating
every listed Engine as ready.

Alt text: The Haros Engine picker is open with Codex selected, Claude marked Sign in, Cursor marked
Not installed, Grok marked Limited, and other unresolved Engines marked Checking.
