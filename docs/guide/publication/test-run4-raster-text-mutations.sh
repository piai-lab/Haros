#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
temp_root="$(mktemp -d /tmp/haros-guidebook-run4-raster-text.XXXXXX)"
trap 'rm -rf -- "$temp_root"' EXIT

cp -R "$guide_root" "$temp_root/guide"

restore_sidecar() {
  cp "$guide_root/assets/generated/$1.md" "$temp_root/guide/assets/generated/$1.md"
}

mutate_line() {
  python3 - "$1" "$2" "$3" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
old = sys.argv[2]
new = sys.argv[3]
source = path.read_text(encoding="utf-8")
if old not in source:
    raise SystemExit(f"mutation anchor not found: {old}")
path.write_text(source.replace(old, new, 1), encoding="utf-8")
PY
}

expect_raster_text_failure() {
  local expected="$1"
  shift
  local output
  if output=$("$@" 2>&1); then
    echo "Run 4 raster-text mutation unexpectedly passed: $expected" >&2
    exit 1
  fi
  if ! grep -qi -- "$expected" <<<"$output"; then
    echo "Run 4 raster-text mutation failed for the wrong reason: $expected" >&2
    echo "$output" >&2
    exit 1
  fi
}

primary="$temp_root/guide/assets/generated/ch-35-primary.md"
secondary="$temp_root/guide/assets/generated/ch-36-secondary.md"
validator=(python3 "$script_dir/validate-run4-raster-text.py" --guide-root "$temp_root/guide" --use-proof-transcript --mutation-mode)

mutate_line "$primary" $'exact_text:\n  - "Desktop host"' $'exact_text:\n  - "Process landscape"\n  - "Desktop host"'
expect_raster_text_failure "process" "${validator[@]}"

restore_sidecar ch-35-primary
mutate_line "$primary" $'  - "Shell-native services"\n  - "Server"\nrelation_contract:' $'  - "Shell-native services"\nrelation_contract:'
expect_raster_text_failure "server" "${validator[@]}"

restore_sidecar ch-36-secondary
mutate_line "$secondary" $'  - "Engine status"\n  - "Settings"\nrelation_contract:' $'  - "Engine status"\nrelation_contract:'
expect_raster_text_failure "settings" "${validator[@]}"

restore_sidecar ch-35-primary
restore_sidecar ch-36-secondary
if output=$(GUIDEBOOK_OCR_MUTATION_EXTRA_TOKEN="rogue raster label" \
  GUIDEBOOK_OCR_MUTATION_SLOT="ch-35-primary" "${validator[@]}" 2>&1); then
  echo "Run 4 injected raster-transcript token unexpectedly passed" >&2
  exit 1
fi
if ! grep -qi -- "rogue" <<<"$output"; then
  echo "Run 4 injected raster-transcript token failed for the wrong reason" >&2
  echo "$output" >&2
  exit 1
fi

echo "run4-raster-text-mutations=PASS cases=4 missing-title=1 removed-server=1 removed-settings=1 injected-token=1"
