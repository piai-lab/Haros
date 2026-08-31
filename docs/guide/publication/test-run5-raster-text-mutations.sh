#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
mutation_root="$(mktemp -d /tmp/haros-guidebook-run5-ocr-mutation.XXXXXX)"
cleanup() {
  rm -rf -- "$mutation_root"
}
trap cleanup EXIT

mkdir -p "$mutation_root/assets/generated"
cp "$guide_root/assets/run5-raster-text-proof.json" "$mutation_root/assets/"
for sidecar in "$guide_root"/assets/generated/*.md; do
  if ! rg -q '^candidate_epoch: run-5-part-vii-appendices$' "$sidecar"; then
    continue
  fi
  cp "$sidecar" "$mutation_root/assets/generated/"
  raster="${sidecar%.md}.jpg"
  ln -s "$raster" "$mutation_root/assets/generated/$(basename "$raster")"
done

python3 - "$mutation_root/assets/generated/appendix-E-01.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
source = source.replace(
    'exact_text:\n', 'exact_text:\n  - "Raster mutation missing label"\n', 1
)
path.write_text(source, encoding="utf-8")
PY

if python3 "$script_dir/validate-run5-raster-text.py" \
  --guide-root "$mutation_root" \
  --use-proof-transcript \
  --mutation-mode >/dev/null 2>&1; then
  echo "run5-raster-text-missing-mutation=FAIL"
  exit 1
fi

cp "$guide_root/assets/generated/appendix-E-01.md" \
  "$mutation_root/assets/generated/appendix-E-01.md"
if GUIDEBOOK_OCR_MUTATION_SLOT=appendix-E-01 \
  GUIDEBOOK_OCR_MUTATION_EXTRA_TOKEN=roguepixelword \
  python3 "$script_dir/validate-run5-raster-text.py" \
    --guide-root "$mutation_root" \
    --use-proof-transcript \
    --mutation-mode >/dev/null 2>&1; then
  echo "run5-raster-text-extra-mutation=FAIL"
  exit 1
fi

pixel_raster="$mutation_root/assets/generated/appendix-A-01.jpg"
python3 - "$pixel_raster" <<'PY'
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

path = Path(sys.argv[1])
with Image.open(path) as opened:
    image = opened.convert("RGB")
path.unlink()
draw = ImageDraw.Draw(image)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 48)
# Deliberately place a legible new label in the same slot, adjacent to the reviewed region.
draw.text((520, 230), "Rogueword", fill=(0, 0, 0), font=font)
image.save(path, format="JPEG", quality=95, subsampling=0)
PY

pixel_log="$mutation_root/pixel-extra.log"
if python3 "$script_dir/validate-run5-raster-text.py" \
  --guide-root "$mutation_root" \
  --write-proof \
  --human-checklist-reviewed >"$pixel_log" 2>&1; then
  echo "run5-raster-text-nearby-pixel-mutation=FAIL"
  exit 1
fi
if ! rg -qi 'rogueword' "$pixel_log"; then
  echo "run5-raster-text-nearby-pixel-mutation=FAIL extra-token-not-observed"
  sed -n '1,20p' "$pixel_log"
  exit 1
fi

echo "run5-raster-text-mutations=PASS missing=detected extra=detected nearby-pixel-extra=detected"
