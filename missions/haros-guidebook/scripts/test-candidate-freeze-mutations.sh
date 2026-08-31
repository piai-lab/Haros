#!/usr/bin/env bash

set -euo pipefail

repo_root="/Users/liuzaoqu/Desktop/Develop/independent/Haros"
cd "$repo_root"

temp_root="$(mktemp -d /tmp/haros-guidebook-freeze-mutations.XXXXXX)"
cleanup() {
  rm -rf -- "$temp_root"
}
trap cleanup EXIT

cp missions/haros-guidebook.md "$temp_root/unformatted-spec.md"
python3 - "$temp_root/unformatted-spec.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
anchor = "# Campaign: Haros Guidebook"
if anchor not in source:
    raise SystemExit("candidate freeze mutation anchor missing")
path.write_text(source.replace(anchor, "#   Campaign: Haros Guidebook", 1), encoding="utf-8")
PY

if GUIDEBOOK_CONTROL_SPEC_OVERRIDE="$temp_root/unformatted-spec.md" \
  bash missions/haros-guidebook/scripts/candidate-hash.sh \
  >"$temp_root/unformatted.out" 2>&1; then
  echo "candidate freeze mutation unexpectedly accepted unformatted canonical spec" >&2
  exit 1
fi
rg -q "candidate freeze refused unformatted control state" "$temp_root/unformatted.out"

bash missions/haros-guidebook/scripts/candidate-hash.sh >"$temp_root/formatted.out"
rg -q '^candidate_files=[0-9]+$' "$temp_root/formatted.out"
rg -q '^candidate_sha256=[0-9a-f]{64}$' "$temp_root/formatted.out"

echo "candidate-freeze-mutations=PASS cases=2 unformatted-control=1 formatted-control=1"
