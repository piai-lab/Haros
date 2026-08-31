#!/usr/bin/env python3

import argparse
import hashlib
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path


EXPECTED_EPUB_TIMESTAMP = (2026, 8, 31, 0, 0, 0)
EXPECTED_EPUB_IDENTIFIER = "urn:uuid:29b2b39c-49eb-5a20-aa38-f95d76acd228"
EXPECTED_COVER_SHA256 = "c073234de73ff85ae972cdd46ded9e5bf89d0c5f76ae3d3f63f9976b9bc02779"


def fail(message: str) -> None:
    raise RuntimeError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256(path)
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def manifest_sha256(items: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for path, checksum in sorted(items.items()):
        digest.update(f"{checksum}  {path}\n".encode())
    return digest.hexdigest()


def validate_pdf(pdf: Path) -> None:
    info = subprocess.run(
        ["pdfinfo", str(pdf)], check=True, capture_output=True, text=True
    ).stdout
    if re.search(r"^(?:CreationDate|ModDate):", info, flags=re.MULTILINE):
        fail(f"PDF contains volatile date metadata: {pdf}")
    for expected in ["Title:           Haros Guidebook", "Pages:           620"]:
        if expected not in info:
            fail(f"PDF metadata drift ({expected}): {pdf}")
    with tempfile.TemporaryDirectory(prefix="haros-guidebook-run6-pdf-cover.") as root:
        prefix = Path(root) / "page-one"
        subprocess.run(
            ["pdfimages", "-f", "1", "-l", "1", "-j", str(pdf), str(prefix)],
            check=True,
            capture_output=True,
            text=True,
        )
        images = sorted(Path(root).glob("page-one-*"))
        if len(images) != 1 or sha256(images[0]) != EXPECTED_COVER_SHA256:
            fail(f"PDF page one is not the byte-exact canonical source-alpha cover: {pdf}")


def validate_epub(epub: Path) -> int:
    with zipfile.ZipFile(epub) as archive:
        members = archive.infolist()
        if not members or members[0].filename != "mimetype":
            fail(f"EPUB mimetype is not first: {epub}")
        if members[0].compress_type != zipfile.ZIP_STORED:
            fail(f"EPUB mimetype is compressed: {epub}")
        if any(member.date_time != EXPECTED_EPUB_TIMESTAMP for member in members):
            fail(f"EPUB member timestamp drift: {epub}")
        opf = archive.read("EPUB/content.opf").decode("utf8")
        ncx = archive.read("EPUB/toc.ncx").decode("utf8")
    for document in [opf, ncx]:
        if EXPECTED_EPUB_IDENTIFIER not in document:
            fail(f"EPUB identifier drift: {epub}")
    for expected in [
        "<dc:date id=\"epub-date\">2026-08-31</dc:date>",
        "<meta property=\"dcterms:modified\">2026-08-31T00:00:00Z</meta>",
    ]:
        if expected not in opf:
            fail(f"EPUB fixed edition metadata missing ({expected}): {epub}")
    return len(members)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--left", type=Path, required=True)
    parser.add_argument("--right", type=Path, required=True)
    args = parser.parse_args()

    left = inventory(args.left)
    right = inventory(args.right)
    if left.keys() != right.keys():
        missing = sorted(left.keys() - right.keys())
        unexpected = sorted(right.keys() - left.keys())
        fail(f"build inventory drift: missing={missing[:10]} unexpected={unexpected[:10]}")
    mismatches = [path for path in left if left[path] != right[path]]
    if mismatches:
        fail(f"build byte reproducibility drift: {mismatches[:10]}")

    edition = "haros-guidebook"
    pdf = args.left / f"{edition}.pdf"
    epub = args.left / f"{edition}.epub"
    validate_pdf(pdf)
    epub_members = validate_epub(epub)
    validate_epub(args.right / f"{edition}.epub")
    website = {path: value for path, value in left.items() if path.startswith("website/")}
    if len(website) != 60:
        fail(f"website inventory drift: {len(website)}")

    print(
        "run6-reproducibility=PASS "
        f"files={len(left)} website_files={len(website)} epub_members={epub_members} "
        f"tree_sha256={manifest_sha256(left)} "
        f"website_sha256={manifest_sha256(website)} "
        f"html_sha256={left[f'{edition}.html']} "
        f"pdf_sha256={left[f'{edition}.pdf']} "
        "pdf_policy=byte-exact-no-volatile-dates+canonical-cover-page-one "
        f"epub_sha256={left[f'{edition}.epub']} "
        "epub_policy=byte-exact-fixed-identifier-date-container-timestamps"
    )


if __name__ == "__main__":
    main()
