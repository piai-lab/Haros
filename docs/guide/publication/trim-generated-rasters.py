#!/usr/bin/env python3
"""Deterministically trim only Guidebook generated rasters.

The crop is the bounding box of pixels whose RGB channels are not all at least
246, expanded by a safety pad equal to 2% of the shorter edge (clamped to
16..40 px). Internal white space is never inspected or removed. Real product
captures are intentionally outside this script's default path and must remain
untrimmed because their frame geometry is evidence.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

from PIL import Image, ImageChops


NEAR_WHITE = 246
MIN_PAD = 16
MAX_PAD = 40
PAD_RATIO = 0.02
# JPEG encoding can introduce a few threshold-crossing pixels inside the
# intended safety pad. Keep the crop idempotent by treating that bounded
# compression halo as part of the pad instead of shaving the raster again on
# every replay.
JPEG_MARGIN_TOLERANCE = 8


def content_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    rgb = image.convert("RGB")
    threshold = Image.new("RGB", rgb.size, (NEAR_WHITE, NEAR_WHITE, NEAR_WHITE))
    darker = ImageChops.difference(ImageChops.darker(rgb, threshold), threshold)
    return darker.getbbox()


def safety_pad(width: int, height: int) -> int:
    return min(MAX_PAD, max(MIN_PAD, round(min(width, height) * PAD_RATIO)))


def crop_box(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = content_bbox(image)
    if bbox is None:
        raise ValueError("raster contains no pixel below the near-white threshold")
    width, height = image.size
    pad = safety_pad(width, height)
    left, top, right, bottom = bbox
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(width, right + pad),
        min(height, bottom + pad),
    )


def outer_margins(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = content_bbox(image)
    if bbox is None:
        raise ValueError("raster contains no pixel below the near-white threshold")
    left, top, right, bottom = bbox
    return left, top, image.width - right, image.height - bottom


def save_deterministically(image: Image.Image, path: Path) -> None:
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        image.convert("RGB").save(
            path,
            format="JPEG",
            quality=90,
            subsampling=0,
            optimize=True,
            progressive=False,
        )
    elif suffix == ".png":
        image.save(path, format="PNG", optimize=True, compress_level=9)
    else:
        raise ValueError(f"unsupported raster extension: {path.suffix}")


def allowed_outer_margin(path: Path, width: int, height: int) -> int:
    tolerance = JPEG_MARGIN_TOLERANCE if path.suffix.lower() in {".jpg", ".jpeg"} else 2
    return safety_pad(width, height) + tolerance


def default_paths() -> list[Path]:
    generated = Path(__file__).resolve().parents[1] / "assets" / "generated"
    return sorted([*generated.glob("*.jpg"), *generated.glob("*.png")])


def sidecar_scalar(source: str, key: str) -> str | None:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.+?)\s*$", source)
    return match.group(1).strip().strip("'\"") if match else None


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--apply", action="store_true", help="crop files in place")
    mode.add_argument("--check", action="store_true", help="reject excessive outer whitespace")
    parser.add_argument("paths", nargs="*", type=Path)
    args = parser.parse_args()
    paths = args.paths or default_paths()
    failures: list[str] = []
    changed = 0

    for path in paths:
        if "assets/captures" in path.as_posix():
            failures.append(f"real capture must not be trimmed: {path}")
            continue
        with Image.open(path) as opened:
            image = opened.convert("RGB")
        sidecar_path = path.with_suffix(".md")
        if not sidecar_path.is_file():
            failures.append(f"missing generated sidecar: {sidecar_path}")
            continue
        sidecar = sidecar_path.read_text(encoding="utf-8")
        recorded_size = sidecar_scalar(sidecar, "size")
        actual_size = f"{image.width}x{image.height}"
        if recorded_size != actual_size:
            failures.append(
                f"generated size metadata drift: {path} recorded={recorded_size} actual={actual_size}"
            )
            continue
        if sidecar_scalar(sidecar, "crop_verdict") != "PASS":
            failures.append(f"generated crop verdict is not PASS: {sidecar_path}")
            continue
        if sidecar_scalar(sidecar, "crop_rule") != "near-white-246-bbox-plus-2pct-pad-16-to-40px":
            failures.append(f"generated crop rule drift: {sidecar_path}")
            continue
        margins = outer_margins(image)
        allowed = allowed_outer_margin(path, *image.size)
        if args.check:
            if any(margin > allowed for margin in margins):
                failures.append(
                    f"excess outer whitespace: {path} margins={margins} allowed<={allowed}"
                )
            continue
        if all(margin <= allowed for margin in margins):
            continue
        original_size = image.size
        for _ in range(4):
            box = crop_box(image)
            if box == (0, 0, image.width, image.height):
                break
            save_deterministically(image.crop(box), path)
            with Image.open(path) as reopened:
                image = reopened.convert("RGB")
            margins = outer_margins(image)
            allowed = allowed_outer_margin(path, *image.size)
            if all(margin <= allowed for margin in margins):
                break
        else:
            failures.append(f"crop did not converge within four passes: {path}")
            continue
        if any(margin > allowed for margin in margins):
            failures.append(
                f"crop did not reach bounded outer whitespace: {path} margins={margins} allowed<={allowed}"
            )
            continue
        if image.size != original_size:
            changed += 1

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    action = "checked" if args.check else "trimmed"
    print(f"generated-raster-trim=PASS mode={action} files={len(paths)} changed={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
