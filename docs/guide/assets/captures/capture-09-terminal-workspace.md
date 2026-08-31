---
kind: real-product-capture
capture_id: capture-09-terminal-workspace
chapter: 26
file: capture-09-terminal-workspace.png
sha256: e73159d84684ddbd3362d4b30ed4f8d5078b4fab8e65d58464b8ef319e0b5764
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

# Terminal workspace capture

Actual components: `TerminalWorkspaceTabs`, `TerminalActivityIndicator`, `I18nProvider`, and
production CSS. Synthetic state: two terminal tabs, the terminal workspace selected, and a harmless
static sentence in place of an xterm instance; no PTY or process is created.

Caption: The production terminal workspace switcher exposes terminal count and Chat separately;
the visual surface does not imply that transcript state owns PTY process state.

Alt text: A Haros terminal workspace has Terminal selected with a count of two, Chat available as a
separate tab, and an isolated dark terminal surface.
