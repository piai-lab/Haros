---
kind: real-product-capture
capture_id: capture-13-studio-outputs
chapter: 33
file: capture-13-studio-outputs.png
sha256: 1dc048cfb6d87384ebab3b349948419db65099362af405e669fdbf8c5f109ada
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

# Studio outputs capture

Actual components: `EnvironmentLabeledSection`, `EnvironmentRow`, production file icons,
`I18nProvider`, and production CSS—the same primitives used by the Studio output projection.
Synthetic state: two named deliverables with relative times; no file exists and no opener runs.

Caption: The production output-row components present attributed deliverables as a bounded list;
workspace files do not become outputs merely because they exist.

Alt text: A Haros Outputs section lists Quarterly review.pdf marked just now and Evidence
table.xlsx marked one minute ago.
