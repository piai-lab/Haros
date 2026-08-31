---
kind: real-product-capture
capture_id: capture-06-permission-decision
chapter: 12
file: capture-06-permission-decision.png
sha256: fc88940d1fda033b4c1606d8beaf4625b6493ccb8bee5fcca7b9dbd18128955d
edition_commit: 17b578d3c65d72113accc17200b9b290f80139f6
viewport: 760x560
frame_dimensions: 680x480
theme: light
locale: en
fixture: apps/web/src/components/GuidebookRun2.capture.browser.tsx
capture_command: bash docs/guide/publication/replay-run2-captures.sh
replay_policy: same-dimensions-and-normalized-rmse-lte-0.002
sanitization: PASS-no-real-user-data-no-credentials-no-endpoints
---

# Permission decision capture

Actual components: `ComposerPendingApprovalPanel`, `ComposerChoiceRow`, `I18nProvider`, and
production CSS. Synthetic state: one command approval for a harmless synthetic test command. The
fixture invokes no command and records no decision.

Caption: The real permission panel scopes approval, refusal, and cancellation as explicit product
decisions for one pending request.

Alt text: A Haros command approval card shows a synthetic lifecycle test command and four choices:
Approve once, Always allow this session, Decline, and Cancel turn.
