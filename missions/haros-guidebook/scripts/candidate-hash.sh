#!/usr/bin/env bash

set -euo pipefail

repo_root="/Users/liuzaoqu/Desktop/Develop/independent/Haros"
cd "$repo_root"

inputs=(
  docs/haros-guidebook-plan.md
  apps/web/src/components/GuidebookPilot.capture.browser.tsx
  apps/web/src/components/GuidebookRun2.capture.browser.tsx
  apps/web/src/components/GuidebookRun3.capture.browser.tsx
  apps/web/src/components/GuidebookRun4.capture.browser.tsx
)

bash missions/haros-guidebook/scripts/assert-no-guidebook-metadata.sh docs/guide

control_spec="${GUIDEBOOK_CONTROL_SPEC_OVERRIDE:-missions/haros-guidebook.md}"
control_goal="${GUIDEBOOK_CONTROL_GOAL_OVERRIDE:-missions/haros-guidebook-goal.md}"
format_output="$(mktemp /tmp/haros-guidebook-freeze-format.XXXXXX)"
if ! bunx oxfmt --check \
  docs/haros-guidebook-plan.md \
  docs/guide \
  "$control_spec" \
  "$control_goal" >"$format_output" 2>&1; then
  cat "$format_output" >&2
  rm -f -- "$format_output"
  echo "candidate freeze refused unformatted control state" >&2
  exit 1
fi
rm -f -- "$format_output"

while IFS= read -r path; do
  inputs+=("$path")
done < <(find docs/guide -type f -not -path '*/__pycache__/*' -print | LC_ALL=C sort)

while IFS= read -r path; do
  inputs+=("$path")
done < <(find missions/haros-guidebook/scripts -type f -print | LC_ALL=C sort)

manifest="$(mktemp /tmp/haros-guidebook-candidate.XXXXXX)"
trap 'rm -f "$manifest"' EXIT

printf '%s\n' "${inputs[@]}" | LC_ALL=C sort -u | while IFS= read -r path; do
  test -f "$path"
  shasum -a 256 "$path"
done >"$manifest"

cat "$manifest"
printf 'candidate_files=%s\n' "$(wc -l <"$manifest" | tr -d ' ')"
printf 'candidate_sha256=%s\n' "$(shasum -a 256 "$manifest" | awk '{print $1}')"
