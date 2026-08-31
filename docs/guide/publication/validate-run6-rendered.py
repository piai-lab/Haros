#!/usr/bin/env python3

import argparse
from pathlib import Path

from lxml import html


def fail(message: str) -> None:
    raise SystemExit(f"validate-run6-rendered: {message}")


parser = argparse.ArgumentParser()
parser.add_argument("--build", required=True, type=Path)
args = parser.parse_args()

surfaces = {
    "website": args.build / "website/index.html",
    "standalone": args.build / "haros-guidebook.html",
}

for label, path in surfaces.items():
    if not path.is_file():
        fail(f"missing {label} cover surface: {path}")
    document = html.parse(path)
    titles = [" ".join(node.itertext()).strip() for node in document.xpath("//head/title")]
    if titles != ["Haros Guidebook"]:
        fail(f"{label} HTML title drift: {titles}")
    if document.xpath("//body/header[@id='title-block-header']"):
        fail(f"{label} Pandoc title block duplicates the canonical README heading")
    cover_headings = document.xpath(
        "//body/h1[@id='haros-guidebook' and normalize-space(.)='Haros Guidebook']"
    )
    if len(cover_headings) != 1:
        fail(f"{label} canonical cover H1 count drift: {len(cover_headings)}")
    all_primary = [
        " ".join(node.itertext()).strip()
        for node in document.xpath("//body/h1")
        if " ".join(node.itertext()).strip() == "Haros Guidebook"
    ]
    if len(all_primary) != 1:
        fail(f"{label} visible Haros Guidebook H1 count drift: {len(all_primary)}")

print(
    "run6-rendered=PASS surfaces=2 html_title=PASS "
    "canonical_readme_h1=1 pandoc_title_block=0"
)
