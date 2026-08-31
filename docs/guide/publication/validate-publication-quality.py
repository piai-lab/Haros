#!/usr/bin/env python3

import argparse
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


def fail(message: str) -> None:
    raise RuntimeError(message)


def validate_html_tables(document: str, label: str) -> int:
    tables = re.findall(r"<table\b[\s\S]*?</table>", document, flags=re.IGNORECASE)
    if len(tables) < 52:
        fail(f"{label}: expected dense table coverage, found {len(tables)} tables")
    for index, table in enumerate(tables, 1):
        if not re.search(r"<th\b", table, flags=re.IGNORECASE):
            fail(f"{label}: table {index} has no header cells")
        if len(re.findall(r"<tr\b", table, flags=re.IGNORECASE)) < 2:
            fail(f"{label}: table {index} has no data row")
    return len(tables)


def validate_pdf(pdf: Path, through_chapter: int, require_chapter_37: bool) -> tuple[int, int]:
    with tempfile.TemporaryDirectory(prefix="haros-guidebook-pdf-quality-") as temporary:
        bbox_path = Path(temporary) / "bbox.html"
        subprocess.run(["pdftotext", "-bbox-layout", str(pdf), str(bbox_path)], check=True)
        root = ET.parse(bbox_path).getroot()
        pages = [element for element in root.iter() if element.tag.endswith("page")]
        words = [element for element in root.iter() if element.tag.endswith("word")]
        if not pages or len(words) < 5000:
            fail(f"{pdf.name}: insufficient readable PDF text ({len(words)} words)")
        for page in pages:
            width = float(page.attrib["width"])
            height = float(page.attrib["height"])
            for word in [element for element in page.iter() if element.tag.endswith("word")]:
                xmin = float(word.attrib["xMin"])
                xmax = float(word.attrib["xMax"])
                ymin = float(word.attrib["yMin"])
                ymax = float(word.attrib["yMax"])
                if xmin < -0.5 or ymin < -0.5 or xmax > width + 0.5 or ymax > height + 0.5:
                    fail(f"{pdf.name}: text escapes page bounds: {''.join(word.itertext())}")
        text = " ".join("".join(word.itertext()) for word in words)
        for chapter in range(1, through_chapter + 1):
            if f"Chapter {chapter}" not in text:
                fail(f"{pdf.name}: missing readable Chapter {chapter} heading")
        if require_chapter_37 and "Chapter 37" not in text:
            fail(f"{pdf.name}: missing readable Chapter 37 heading")
        if "�" in text:
            fail(f"{pdf.name}: replacement character found in extracted text")
        return len(pages), len(words)


def validate_epub(epub: Path, expected_tables: int) -> None:
    with zipfile.ZipFile(epub) as archive:
        names = archive.namelist()
        combined = "\n".join(
            archive.read(name).decode("utf-8", errors="replace")
            for name in names
            if name.endswith((".xhtml", ".html", ".opf", ".css"))
        )
        xhtml = "\n".join(
            archive.read(name).decode("utf-8", errors="replace")
            for name in names
            if name.endswith((".xhtml", ".html"))
        )
    if re.search(r"rendition:layout[^<]*(?:pre-paginated|fixed)", combined, flags=re.I):
        fail(f"{epub.name}: fixed-layout EPUB metadata found")
    if re.search(r"<(?:table|img)\b[^>]*(?:width|height)=['\"]\d+px", xhtml, flags=re.I):
        fail(f"{epub.name}: fixed pixel table/image geometry found")
    if "max-width: 100%" not in combined or "overflow-x: auto" not in combined:
        fail(f"{epub.name}: responsive image/table CSS missing")
    if len(re.findall(r"<table\b", xhtml, flags=re.I)) != expected_tables:
        fail(f"{epub.name}: table count drift from standalone HTML")


def validate_build(
    build_root: Path, edition: str, through_chapter: int, require_chapter_37: bool
) -> None:
    standalone = build_root / f"{edition}.html"
    pdf = build_root / f"{edition}.pdf"
    epub = build_root / f"{edition}.epub"
    tables = validate_html_tables(standalone.read_text(encoding="utf-8"), standalone.name)
    pages, words = validate_pdf(pdf, through_chapter, require_chapter_37)
    validate_epub(epub, tables)
    print(
        f"publication-quality=PASS edition={edition} tables={tables} "
        f"pdf_pages={pages} pdf_words={words} epub=reflow"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--build",
        nargs=3,
        action="append",
        metavar=("BUILD_ROOT", "EDITION_BASENAME", "SCOPE"),
        required=True,
    )
    args = parser.parse_args()
    for build_root, edition, scope in args.build:
        through_match = re.fullmatch(r"through-(\d+)", scope)
        through_chapter = int(through_match.group(1)) if through_match else 15
        validate_build(
            Path(build_root), edition, through_chapter, scope == "includes-ch37"
        )


if __name__ == "__main__":
    main()
