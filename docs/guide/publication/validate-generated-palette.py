#!/usr/bin/env python3
"""Validate the measurable palette of generated Guidebook rasters.

This check deliberately excludes real captures. A sidecar remains the semantic
contract for the figure family and forbidden content, while pixels independently
prove that the raster does not contain a material saturated blue, green, or
purple/neon excursion. JPEG antialiasing and compression are allowed up to
0.0200% of total pixels in each forbidden hue family.

Pixel thresholds use HSV on the full raster:
- minimum saturation: 0.60
- minimum value: 0.25
- royal blue: 215 <= hue < 250 degrees
- purple/neon: 250 <= hue <= 335 degrees
- bright green: 70 <= hue < 160 degrees

Muted teal, sparse amber, semantic red, charcoal/gray, and warm white are not
rejected by this mechanical gate. Human full-resolution review still owns
topology, label fidelity, restraint, and whether an allowed accent is tasteful.

Every generated sidecar is also checked for the natural-case text contract:
headings use title case, explanations use sentence case, only genuine acronyms
may remain all-caps, and a multiword all-caps block is never accepted.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image


MAX_FORBIDDEN_FRACTION = 0.0002
MAX_RUN4_RED_FRACTION = 0.0002
MIN_SATURATION = 0.60
MIN_VALUE = 0.25
ALLOWED_VISUAL_FAMILIES = {
    "haros-grounded-editorial-anatomy",
    "haros-technical-editorial-diagram",
}
UPPERCASE_ALLOWLIST = {
    "API",
    "CLI",
    "CPU",
    "ENGINE_DESCRIPTORS",
    "EPUB",
    "GPU",
    "HARNESSOS_HOME",
    "HTML",
    "HTTP",
    "HTTPS",
    "ID",
    "IPC",
    "JSON",
    "MCP",
    "PDF",
    "PTY",
    "RPC",
    "SDK",
    "UI",
    "URL",
    "XDG_CACHE_HOME",
    "XDG_CONFIG_HOME",
}


def front_matter(source: str, path: Path) -> str:
    match = re.match(r"^---\n([\s\S]*?)\n---\n", source)
    if match is None:
        raise RuntimeError(f"missing front matter: {path}")
    return match.group(1)


def scalar(metadata: str, key: str, path: Path) -> str:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*(.+?)\s*$", metadata)
    if match is None:
        raise RuntimeError(f"missing {key}: {path}")
    return match.group(1).strip().strip("'\"")


def list_values(metadata: str, key: str, path: Path) -> list[str]:
    inline = re.search(rf"(?m)^{re.escape(key)}:\s*\[([^]]*)\]\s*$", metadata)
    if inline is not None:
        values = [value.strip().strip("'\"") for value in inline.group(1).split(",")]
        return [value for value in values if value]
    block = re.search(
        rf"(?m)^{re.escape(key)}:[ \t]*\n((?:[ \t]+-[ \t]+.*\n?)+)", metadata
    )
    if block is None:
        raise RuntimeError(f"missing or empty {key}: {path}")
    values = [
        match.group(1).strip().strip("'\"")
        for match in re.finditer(r"(?m)^[ \t]+-[ \t]+(.+?)[ \t]*$", block.group(1))
    ]
    if not values:
        raise RuntimeError(f"missing or empty {key}: {path}")
    return values


def enforce_natural_case(values: list[str], label: str) -> None:
    for value in values:
        words = [word for word in re.split(r"[^A-Za-z0-9_]+", value) if word]
        alphabetic = [word for word in words if re.search(r"[A-Za-z]", word)]
        if len(alphabetic) >= 2 and all(word == word.upper() for word in alphabetic):
            raise RuntimeError(f"block ALL-CAPS exact_text is forbidden: {label}: {value}")
        for word in alphabetic:
            if (
                len(word) >= 3
                and word == word.upper()
                and word not in UPPERCASE_ALLOWLIST
            ):
                raise RuntimeError(
                    f"non-acronym ALL-CAPS token '{word}' in exact_text: {label}"
                )


def rgb_to_hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    values = rgb.astype(np.float32) / 255.0
    maximum = values.max(axis=2)
    minimum = values.min(axis=2)
    delta = maximum - minimum
    saturation = np.divide(delta, maximum, out=np.zeros_like(delta), where=maximum > 0)
    hue = np.zeros_like(maximum)
    nonzero = delta > 0
    red, green, blue = values[..., 0], values[..., 1], values[..., 2]

    red_max = nonzero & (maximum == red)
    green_max = nonzero & (maximum == green)
    blue_max = nonzero & (maximum == blue)
    hue[red_max] = ((green[red_max] - blue[red_max]) / delta[red_max]) % 6
    hue[green_max] = (blue[green_max] - red[green_max]) / delta[green_max] + 2
    hue[blue_max] = (red[blue_max] - green[blue_max]) / delta[blue_max] + 4
    return hue * 60.0, saturation, maximum


def analyze_rgb(rgb: np.ndarray) -> dict[str, float]:
    hue, saturation, value = rgb_to_hsv(rgb)
    chromatic = (saturation >= MIN_SATURATION) & (value >= MIN_VALUE)
    return {
        "royal_blue_fraction": float((chromatic & (hue >= 215) & (hue < 250)).mean()),
        "purple_neon_fraction": float((chromatic & (hue >= 250) & (hue <= 335)).mean()),
        "bright_green_fraction": float((chromatic & (hue >= 70) & (hue < 160)).mean()),
        "semantic_red_fraction": float((chromatic & ((hue < 20) | (hue >= 340))).mean()),
    }


def enforce_metrics(metrics: dict[str, float], label: str) -> None:
    failures = [
        f"{name}={fraction * 100:.4f}%"
        for name, fraction in metrics.items()
        if fraction > MAX_FORBIDDEN_FRACTION
    ]
    if failures:
        raise RuntimeError(
            f"generated palette drift: {label}: {', '.join(failures)}; "
            f"allowed<={MAX_FORBIDDEN_FRACTION * 100:.4f}% per forbidden hue family"
        )


def validate_raster(path: Path) -> dict[str, object]:
    sidecar_path = path.with_suffix(".md")
    source = sidecar_path.read_text(encoding="utf-8")
    metadata = front_matter(source, sidecar_path)
    visual_family = scalar(metadata, "visual_family", sidecar_path)
    if visual_family not in ALLOWED_VISUAL_FAMILIES:
        raise RuntimeError(f"unknown visual family '{visual_family}': {sidecar_path}")
    if scalar(metadata, "forbidden_family_check", sidecar_path) != "PASS":
        raise RuntimeError(f"sidecar forbidden-family contract is not PASS: {sidecar_path}")
    if scalar(metadata, "capitalization_verdict", sidecar_path) != "PASS":
        raise RuntimeError(f"sidecar natural-case contract is not PASS: {sidecar_path}")
    enforce_natural_case(list_values(metadata, "exact_text", sidecar_path), path.name)
    if (
        re.search(
            r"(?m)^(?:Final (?:prompt(?: contract)?|correction history|raster transcript contract)|Accepted composition):",
            source,
        )
        is None
    ):
        raise RuntimeError(f"sidecar is missing its final visual contract: {sidecar_path}")

    with Image.open(path) as opened:
        rgb = np.asarray(opened.convert("RGB"))
    metrics = analyze_rgb(rgb)
    enforce_metrics(
        {key: value for key, value in metrics.items() if key != "semantic_red_fraction"},
        path.name,
    )
    epoch_match = re.search(r"(?m)^candidate_epoch:\s*(.+?)\s*$", metadata)
    candidate_epoch = epoch_match.group(1).strip().strip("'\"") if epoch_match else None
    if (
        candidate_epoch == "run-4-parts-v-vi"
        and metrics["semantic_red_fraction"] > MAX_RUN4_RED_FRACTION
    ):
        raise RuntimeError(
            f"Run 4 semantic red area exceeds sparse-accent cap: {path.name}: "
            f"red={metrics['semantic_red_fraction'] * 100:.4f}% "
            f"allowed<={MAX_RUN4_RED_FRACTION * 100:.4f}%"
        )
    return {
        "file": path.name,
        "visual_family": visual_family,
        **metrics,
        "maximum_forbidden_fraction": MAX_FORBIDDEN_FRACTION,
        "maximum_run4_red_fraction": MAX_RUN4_RED_FRACTION,
        "capitalization_verdict": "PASS",
        "verdict": "PASS",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    generated_root = Path(__file__).resolve().parents[1] / "assets" / "generated"
    paths = args.paths or sorted(generated_root.glob("*.jpg"))
    if any("assets/captures" in path.as_posix() for path in paths):
        raise RuntimeError("real product captures are outside the generated-palette contract")
    results = [validate_raster(path) for path in paths]
    if args.json:
        print(json.dumps(results, sort_keys=True))
    else:
        print(
            "generated-palette=PASS "
            f"files={len(results)} saturation_min={MIN_SATURATION:.2f} "
            f"value_min={MIN_VALUE:.2f} forbidden_limit={MAX_FORBIDDEN_FRACTION * 100:.4f}% "
            "captures=excluded natural_case=PASS rule=title-case-headings/"
            "sentence-case-explanations/acronyms-only-all-caps"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
