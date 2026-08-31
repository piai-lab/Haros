#!/usr/bin/env python3

from pathlib import Path
import sys

from lxml import html


def fail(message: str) -> None:
    raise SystemExit(f"prepare-pdf: {message}")


if len(sys.argv) != 3:
    fail("usage: prepare-pdf.py INPUT_HTML OUTPUT_HTML")

input_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
document = html.parse(input_path)

body = document.xpath("//body")
toc = document.xpath("//body/nav[@id='TOC']")
cover_heading = document.xpath("//body/h1[@id='haros-guidebook']")
if len(body) != 1 or len(toc) != 1 or len(cover_heading) != 1:
    fail("expected one body, table of contents, and canonical cover heading")

cover_figure = cover_heading[0].getnext()
if cover_figure is None or cover_figure.tag != "figure":
    fail("canonical cover figure must immediately follow the cover heading")
cover_images = cover_figure.xpath(
    ".//img[contains(@aria-label, 'source-alpha edition label')]"
)
if len(cover_images) != 1:
    fail("canonical source-alpha cover image was not found")

cover_figure.set("class", "pdf-cover")
toc_node = toc[0]
toc_node.getparent().remove(toc_node)
cover_figure.addnext(toc_node)

output_path.parent.mkdir(parents=True, exist_ok=True)
document.write(
    output_path,
    encoding="utf-8",
    method="html",
    doctype="<!DOCTYPE html>",
)
print("prepare-pdf=PASS cover=page-one toc=after-cover standalone=unchanged")
