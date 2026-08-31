#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
left_build="${1:?left build is required}"
right_build="${2:?right build is required}"
temp_root="$(mktemp -d /tmp/haros-guidebook-run6-mutations.XXXXXX)"
repo_root="$(cd -- "$script_dir/../../.." && pwd)"
candidate_hash_script="$repo_root/missions/haros-guidebook/scripts/candidate-hash.sh"
metadata_guard="$repo_root/missions/haros-guidebook/scripts/assert-no-guidebook-metadata.sh"
canonical_before="$temp_root/canonical-before.txt"
bash "$candidate_hash_script" >"$canonical_before"
cleanup() {
  status=$?
  canonical_after="$temp_root/canonical-after.txt"
  if ! bash "$candidate_hash_script" >"$canonical_after"; then
    echo "run6 mutation cleanup could not recompute canonical candidate" >&2
    status=1
  elif ! cmp -s "$canonical_before" "$canonical_after"; then
    echo "run6 mutation changed canonical candidate file-set or bytes" >&2
    diff -u "$canonical_before" "$canonical_after" >&2 || true
    status=1
  else
    echo "run6-canonical-candidate-integrity=PASS file-set-and-bytes=unchanged"
  fi
  rm -rf -- "$temp_root"
  trap - EXIT
  exit "$status"
}
trap cleanup EXIT

cp -R "$script_dir/.." "$temp_root/guide"
python3 - "$temp_root/guide/part-02-workbench/10-composer-control-surface.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
anchor = "apps/web/src/components/ChatView.tsx#onSend"
if anchor not in source:
    raise SystemExit("Chapter 10 onSend mutation anchor missing")
path.write_text(source.replace(anchor, "apps/web/src/components/ChatView.tsx#sendMessage", 1), encoding="utf-8")
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" \
  node "$script_dir/validate-run6.mjs" >"$temp_root/symbol.out" 2>&1; then
  echo "run6 mutation unexpectedly accepted stale Chapter 10 code symbol" >&2
  exit 1
fi
rg -q "missing code symbol fragment .*ChatView.tsx#sendMessage" "$temp_root/symbol.out"

cp -R "$left_build" "$temp_root/rendered-build"
python3 - "$temp_root/rendered-build/website/index.html" \
  "$temp_root/rendered-build/haros-guidebook.html" <<'PY'
from pathlib import Path
import sys

for value in sys.argv[1:]:
    path = Path(value)
    source = path.read_text(encoding="utf-8")
    anchor = "<body>"
    if anchor not in source:
        raise SystemExit(f"rendered body mutation anchor missing: {path}")
    duplicate = '<header id="title-block-header"><h1 class="title">Haros Guidebook</h1></header>'
    path.write_text(source.replace(anchor, anchor + duplicate, 1), encoding="utf-8")
PY
if python3 "$script_dir/validate-run6-rendered.py" \
  --build "$temp_root/rendered-build" >"$temp_root/rendered.out" 2>&1; then
  echo "run6 mutation unexpectedly accepted duplicate cover H1" >&2
  exit 1
fi
rg -q "Pandoc title block duplicates" "$temp_root/rendered.out"

metadata_root="$temp_root/metadata-scope"
mkdir -p "$metadata_root"
: >"$metadata_root/.DS_Store"
if bash "$metadata_guard" "$metadata_root" >"$temp_root/candidate-scope.out" 2>&1; then
  echo "run6 mutation unexpectedly accepted .DS_Store candidate input" >&2
  exit 1
fi
rg -q "candidate scope contains nondeliverable OS metadata" "$temp_root/candidate-scope.out"

cp "$left_build/haros-guidebook.html" "$temp_root/cover-input.html"
python3 - "$temp_root/cover-input.html" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
anchor = "source-alpha edition label"
if anchor not in source:
    raise SystemExit("cover mutation anchor missing")
path.write_text(source.replace(anchor, "edition label", 1), encoding="utf-8")
PY
if python3 "$script_dir/prepare-pdf.py" \
  "$temp_root/cover-input.html" \
  "$temp_root/cover-output.html" >"$temp_root/cover.out" 2>&1; then
  echo "run6 mutation unexpectedly accepted missing source-alpha cover identity" >&2
  exit 1
fi
rg -q "canonical source-alpha cover image was not found" "$temp_root/cover.out"

python3 - "$right_build/haros-guidebook.pdf" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
with path.open("ab") as stream:
    stream.write(b"run6-pdf-reproducibility-mutation\n")
PY
if python3 "$script_dir/validate-run6-reproducibility.py" \
  --left "$left_build" \
  --right "$right_build" >"$temp_root/repro.out" 2>&1; then
  echo "run6 mutation unexpectedly accepted PDF byte drift" >&2
  exit 1
fi
rg -q "haros-guidebook.pdf" "$temp_root/repro.out"

echo "run6-validator-mutations=PASS cases=5 code-symbol-fragment=1 duplicate-cover-h1=1 isolated-candidate-os-metadata=1 pdf-cover-identity=1 pdf-byte-reproducibility=1"
