#!/usr/bin/env python3

import argparse
import html
import json
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path


def normalize(value: str) -> str:
    value = html.unescape(value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.translate(
        str.maketrans({"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u00a0": " "})
    )
    value = value.replace("`", "").replace("*", "").replace("_", "")
    value = re.sub(r"\s*/\s*", "/", value)
    value = re.sub(r"-\s+(?=[a-z])", "-", value)
    value = re.sub(r"\s+([,.;:!?])", r"\1", value)
    return re.sub(r"\s+", " ", value).strip()


def contracts(script_dir: Path) -> list[dict]:
    output = subprocess.check_output(
        ["node", str(script_dir / "figure-contracts.mjs"), "--json"], text=True
    )
    return json.loads(output)


def assert_html_association(document: str, contract: dict, label: str) -> bool:
    contract_alt = normalize(contract["alt"])
    contract_caption = normalize(contract["caption"])
    contract_extended = normalize(contract["extended"])
    images = list(re.finditer(r"<img\b[^>]*>", document, flags=re.IGNORECASE))
    for index, image_match in enumerate(images):
        tag = image_match.group(0)
        alt_match = re.search(r'\balt="([^"]*)"', tag, flags=re.IGNORECASE)
        if not alt_match or normalize(alt_match.group(1)) != contract_alt:
            continue
        end = images[index + 1].start() if index + 1 < len(images) else len(document)
        associated = normalize(document[image_match.end() : end])
        if contract_caption not in associated:
            raise RuntimeError(f"rendered caption association drift: {contract['mediaName']} in {label}")
        if contract_extended not in associated:
            raise RuntimeError(
                f"rendered extended-description association drift: {contract['mediaName']} in {label}"
            )
        return True
    return False


def validate_build(build_root: Path, edition: str, all_contracts: list[dict]) -> dict[str, set[str]]:
    seen = {contract["mediaName"]: set() for contract in all_contracts}
    website_root = build_root / "website"
    standalone = build_root / f"{edition}.html"
    pdf = build_root / f"{edition}.pdf"
    epub = build_root / f"{edition}.epub"
    for required in [website_root, standalone, pdf, epub]:
        if not required.exists():
            raise RuntimeError(f"missing rendered artifact: {required}")

    website_documents = {
        path.name: path.read_text(encoding="utf-8") for path in website_root.glob("*.html")
    }
    for contract in all_contracts:
        website_name = (
            "index.html"
            if contract["source"] == "README.md"
            else f"{Path(contract['source']).stem}.html"
        )
        document = website_documents.get(website_name)
        if document and assert_html_association(document, contract, f"website/{website_name}"):
            seen[contract["mediaName"]].add("website")

    standalone_document = standalone.read_text(encoding="utf-8")
    for contract in all_contracts:
        if assert_html_association(standalone_document, contract, standalone.name):
            seen[contract["mediaName"]].add("standalone")

    with zipfile.ZipFile(epub) as archive:
        epub_document = "\n".join(
            archive.read(name).decode("utf-8", errors="replace")
            for name in archive.namelist()
            if name.endswith((".xhtml", ".html"))
        )
    for contract in all_contracts:
        if assert_html_association(epub_document, contract, epub.name):
            seen[contract["mediaName"]].add("epub")

    with tempfile.TemporaryDirectory(prefix="haros-guidebook-pdf-text-") as temporary:
        text_path = Path(temporary) / "edition.txt"
        subprocess.run(["pdftotext", "-layout", str(pdf), str(text_path)], check=True)
        pdf_text = normalize(text_path.read_text(encoding="utf-8", errors="replace"))
    for contract in all_contracts:
        caption_index = pdf_text.find(normalize(contract["caption"]))
        if caption_index == -1:
            continue
        extended_index = pdf_text.find(normalize(contract["extended"]), caption_index)
        if extended_index == -1 or extended_index - caption_index > 3000:
            raise RuntimeError(f"PDF relation association drift: {contract['mediaName']} in {pdf.name}")
        seen[contract["mediaName"]].add("pdf")
    return seen


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--build",
        nargs=2,
        action="append",
        metavar=("BUILD_ROOT", "EDITION_BASENAME"),
        required=True,
    )
    args = parser.parse_args()
    script_dir = Path(__file__).resolve().parent
    all_contracts = contracts(script_dir)
    combined = {contract["mediaName"]: set() for contract in all_contracts}
    for build_root, edition in args.build:
        seen = validate_build(Path(build_root), edition, all_contracts)
        for media_name, formats in seen.items():
            combined[media_name].update(formats)
    required = {"website", "standalone", "epub", "pdf"}
    failures = {
        media_name: sorted(required - formats)
        for media_name, formats in combined.items()
        if formats != required
    }
    if failures:
        raise RuntimeError(f"rendered figure format coverage failed: {failures}")
    print(f"rendered-figure-contracts=PASS figures={len(all_contracts)} formats=4")


if __name__ == "__main__":
    main()
