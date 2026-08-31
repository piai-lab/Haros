#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$guide_root/../.." && pwd)"
web_root="$repo_root/apps/web"

replay_root="${GUIDEBOOK_RUN3_CAPTURE_REPLAY_DIR:-$(mktemp -d "$web_root/node_modules/.guidebook-run3-capture-replay.XXXXXX")}"
state_root="${GUIDEBOOK_RUN3_CAPTURE_STATE_DIR:-$(mktemp -d /tmp/haros-guidebook-run3-capture-state.XXXXXX)}"
mkdir -p "$replay_root" "$state_root/harnessos-home" "$state_root/xdg-config" "$state_root/xdg-cache"
replay_root="$(cd "$replay_root" && pwd)"

(
  cd "$web_root"
  HARNESSOS_HOME="$state_root/harnessos-home" \
    XDG_CONFIG_HOME="$state_root/xdg-config" \
    XDG_CACHE_HOME="$state_root/xdg-cache" \
    VITE_GUIDEBOOK_CAPTURE_ROOT="$replay_root" \
    bunx vitest run --config vitest.browser.stable.config.ts \
    src/components/GuidebookRun3.capture.browser.tsx
)

capture_count=0
maximum_normalized_rmse="0.002"
for capture_id in \
  capture-07-proposed-plan \
  capture-08-subagent-lineage \
  capture-09-terminal-workspace \
  capture-10-diff-review \
  capture-11-browser-tabs \
  capture-12-device-setup \
  capture-13-studio-outputs \
  capture-14-automation-created; do
  sidecar="$guide_root/assets/captures/$capture_id.md"
  media_name="$(sed -n 's/^file: //p' "$sidecar")"
  expected_sha="$(sed -n 's/^sha256: //p' "$sidecar")"
  canonical_file="$guide_root/assets/captures/$media_name"
  replay_file="$replay_root/$media_name"
  test -s "$replay_file"
  test "$(shasum -a 256 "$canonical_file" | awk '{print $1}')" = "$expected_sha"
  test "$(magick identify -format '%wx%h' "$canonical_file")" = "$(magick identify -format '%wx%h' "$replay_file")"
  replay_sha="$(shasum -a 256 "$replay_file" | awk '{print $1}')"
  rmse_output="$(magick compare -metric RMSE "$canonical_file" "$replay_file" null: 2>&1 || true)"
  normalized_rmse="$(printf '%s' "$rmse_output" | sed -E 's/.*\(([^)]+)\).*/\1/')"
  python3 - "$normalized_rmse" "$maximum_normalized_rmse" <<'PY'
import sys

observed = float(sys.argv[1])
maximum = float(sys.argv[2])
if observed > maximum:
    raise SystemExit(f"normalized RMSE {observed} exceeds {maximum}")
PY
  printf 'capture=%s canonical_sha256=%s replay_sha256=%s normalized_rmse=%s maximum=%s result=PASS\n' \
    "$media_name" "$expected_sha" "$replay_sha" "$normalized_rmse" "$maximum_normalized_rmse"
  capture_count=$((capture_count + 1))
done

test "$capture_count" = "8"
printf 'run3-capture-replay=PASS captures=%s state=%s output=%s\n' \
  "$capture_count" "$state_root" "$replay_root"
