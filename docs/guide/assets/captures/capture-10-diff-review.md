---
kind: real-product-capture
capture_id: capture-10-diff-review
chapter: 28
file: capture-10-diff-review.png
sha256: 8a9b1e111129643ede65168bd973f53249d12ba186b8874f8c658eac38ae1d69
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

# Diff review capture

Actual components: `ReviewFileTreePanel`, production file-tree rows, `SearchInput`,
`FileEntryIcon`, `I18nProvider`, and production CSS. Synthetic state: two changed files under a
synthetic `src` directory; no repository is read and no rollback action is offered or invoked.

Caption: The real review file tree identifies the bounded files in a diff without treating that
view as either a Git checkpoint or a conversation rollback.

Alt text: A Haros Review files panel shows an expanded src directory containing queue.test.ts and
the selected queue.ts file, with a filter control above.
