#!/usr/bin/env bash

set -euo pipefail

repo_root="/Users/liuzaoqu/Desktop/Develop/independent/Haros"
cd "$repo_root"

guard="missions/haros-guidebook/scripts/assert-no-guidebook-metadata.sh"
mutation_script="docs/guide/publication/test-run6-validator-mutations.sh"
temp_root="$(mktemp -d /tmp/haros-guidebook-metadata-mutations.XXXXXX)"
cleanup() {
  rm -rf -- "$temp_root"
}
trap cleanup EXIT

forbidden_target='docs/guide/'".DS_Store"
if rg -F "$forbidden_target" "$mutation_script" >/dev/null; then
  echo "mutation isolation self-test found canonical metadata write target" >&2
  exit 1
fi
if rg -q 'candidate_ds_store|script_dir/\.\./\.DS_Store' "$mutation_script"; then
  echo "mutation isolation self-test found retired canonical metadata variable" >&2
  exit 1
fi

mkdir -p "$temp_root/clean" "$temp_root/rejected"
bash "$guard" "$temp_root/clean"
: >"$temp_root/rejected/.DS_Store"
if bash "$guard" "$temp_root/rejected" >"$temp_root/rejected.out" 2>&1; then
  echo "metadata guard unexpectedly accepted isolated .DS_Store" >&2
  exit 1
fi
rg -q 'candidate scope contains nondeliverable OS metadata' "$temp_root/rejected.out"

echo "candidate-mutation-isolation=PASS cases=3 static-canonical-target=0 clean-temp=PASS temp-DS-rejected=PASS"
