#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
temp_root="$(mktemp -d /tmp/haros-guidebook-run4-mutations.XXXXXX)"
trap 'rm -rf -- "$temp_root"' EXIT

reset_fixture() {
  rm -rf -- "$temp_root/guide"
  cp -R "$guide_root" "$temp_root/guide"
}

reset_fixture
python3 - "$temp_root/guide/part-06-reliability/46-secrets-trust-local-boundaries.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
old = "[Guidebook contents](../README.md) · [Previous: Restart, Quit, and Recovery](45-restart-quit-recovery.md)"
new = old + " · [Next: Unwritten chapter](47-unwritten.md)"
if old not in source:
    raise SystemExit("Chapter 46 navigation anchor not found")
path.write_text(source.replace(old, new, 1))
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/sync-navigation.mjs" --check >/dev/null 2>&1; then
  echo "Run 4 terminal-navigation mutation unexpectedly passed" >&2
  exit 1
fi

reset_fixture
python3 - "$temp_root/guide/part-06-reliability/46-secrets-trust-local-boundaries.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
old = "`Revalidate origin`, `Strip sensitive headers`, and `Revalidate address`"
new = "`Strip sensitive headers`, `Revalidate origin`, and `Revalidate address`"
if old not in source:
    raise SystemExit("Chapter 46 redirect relation anchor not found")
path.write_text(source.replace(old, new, 1))
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" >/dev/null 2>&1; then
  echo "Run 4 relation mutation unexpectedly passed" >&2
  exit 1
fi

reset_fixture
python3 - "$temp_root/guide/assets/generated/part-06-opener.jpg" <<'PY'
from pathlib import Path
import sys
from PIL import Image, ImageDraw

path = Path(sys.argv[1])
with Image.open(path) as opened:
    image = opened.convert("RGB")
draw = ImageDraw.Draw(image)
draw.rectangle((20, 20, 220, 120), fill=(220, 32, 32))
image.save(path, format="JPEG", quality=90, subsampling=0, optimize=True, progressive=False)
PY
if python3 "$script_dir/validate-generated-palette.py" \
  "$temp_root/guide/assets/generated/part-06-opener.jpg" >/dev/null 2>&1; then
  echo "Run 4 semantic-red mutation unexpectedly passed" >&2
  exit 1
fi

reset_fixture
python3 - "$temp_root/guide/assets/generated/ch-46-primary.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
old = '  - "Server-side secret owner"'
new = '  - "SERVER-SIDE SECRET OWNER"'
if old not in source:
    raise SystemExit("Run 4 natural-case anchor not found")
path.write_text(source.replace(old, new, 1))
PY
if python3 "$script_dir/validate-generated-palette.py" \
  "$temp_root/guide/assets/generated/ch-46-primary.jpg" >/dev/null 2>&1; then
  echo "Run 4 natural-case mutation unexpectedly passed" >&2
  exit 1
fi

reset_fixture
python3 - "$temp_root/guide/assets/parts-05-06-visual-truth.md" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
source = path.read_text()
mutated, count = re.subn(r"(`ch-46-extra`[^\n]*?`)[0-9a-f]{12}(…`)", r"\1deadbeefdead\2", source, count=1)
if count != 1:
    raise SystemExit("Run 4 truth-row hash anchor not found")
path.write_text(mutated)
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/sync-visual-truth.mjs" --check >/dev/null 2>&1; then
  echo "Run 4 truth-sheet mutation unexpectedly passed" >&2
  exit 1
fi

bash "$script_dir/test-run4-raster-text-mutations.sh"

echo "run4-validator-mutations=PASS cases=9 navigation=1 relations=1 red-cap=1 natural-case=1 truth-hash=1 raster-text=4"
