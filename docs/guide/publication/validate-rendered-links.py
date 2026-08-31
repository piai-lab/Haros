#!/usr/bin/env python3

from __future__ import annotations

import argparse
from collections import Counter
import posixpath
import re
import subprocess
import sys
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class LinkDocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.hrefs: list[str] = []
        self.anchors: list[tuple[str, str]] = []
        self.image_alts: list[str] = []
        self.text: list[str] = []
        self.current_anchor: tuple[str, list[str]] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        identifier = values.get("id") or values.get("name")
        if identifier:
            self.ids.add(identifier)
        if tag.lower() == "a" and values.get("href") is not None:
            href = values["href"] or ""
            self.hrefs.append(href)
            self.current_anchor = (href, [])
        if tag.lower() == "img" and values.get("alt") is not None:
            self.image_alts.append(values["alt"] or "")

    def handle_data(self, data: str) -> None:
        self.text.append(data)
        if self.current_anchor is not None:
            self.current_anchor[1].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self.current_anchor is not None:
            href, text = self.current_anchor
            self.anchors.append((href, normalized_text("".join(text))))
            self.current_anchor = None


def parse_document(source: str) -> LinkDocumentParser:
    parser = LinkDocumentParser()
    parser.feed(source)
    parser.close()
    return parser


def internal_target(href: str) -> tuple[str, str] | None:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc:
        return None
    return unquote(parts.path), unquote(parts.fragment)


def fail(message: str) -> None:
    raise RuntimeError(message)


def normalized_text(source: str) -> str:
    return re.sub(r"\s+", " ", source).strip()


def rendered_id_for_source(path: Path) -> str:
    if path.name == "README.md":
        return "haros-guidebook"
    if path.name == "00-preface.md":
        return "preface"
    chapter = re.match(r"^(\d+)-", path.name)
    if chapter is not None:
        return f"chapter-{chapter.group(1)}"
    appendix = re.match(r"^appendix-([a-h])-", path.name)
    if appendix is not None:
        return f"appendix-{appendix.group(1)}"
    fail(f"navigation: cannot derive rendered id for {path}")


def website_name_for_source(path: Path) -> str:
    return "index.html" if path.name == "README.md" else f"{path.stem}.html"


def source_navigation_relations() -> list[dict[str, str]]:
    guide_root = Path(__file__).resolve().parent.parent
    readme_path = guide_root / "README.md"
    readme = readme_path.read_text(encoding="utf-8")
    order = [("Preface", guide_root / "00-preface.md")]
    order.extend(
        (title, (guide_root / target.split("#", 1)[0]).resolve())
        for title, target in re.findall(
            r"(?m)^\d+\. \[([^]]+)\]\(([^)#]+\.md)(?:#[^)]+)?\)$",
            readme,
        )
    )
    order.extend(
        (f"Appendix {letter} — {title}", (guide_root / target.split("#", 1)[0]).resolve())
        for letter, title, target in re.findall(
            r"(?m)^([A-H])\. \[([^]]+)\]\(([^)#]+\.md)(?:#[^)]+)?\)$",
            readme,
        )
    )
    if len(order) != 59:
        fail(
            "navigation: README sole order expected Preface plus 50 chapters and "
            f"8 appendices, found {len(order)}"
        )
    relations: list[dict[str, str]] = []
    for index, (title, source_path) in enumerate(order):
        required = [("Guidebook contents", readme_path)]
        if index > 0:
            required.append((f"Previous: {order[index - 1][0]}", order[index - 1][1]))
        if index + 1 < len(order):
            required.append((f"Next: {order[index + 1][0]}", order[index + 1][1]))
        source = source_path.read_text(encoding="utf-8")
        block = re.search(
            r"<!-- guide-navigation:start -->([\s\S]*?)<!-- guide-navigation:end -->",
            source,
        )
        if block is None:
            fail(f"navigation: missing generated source block: {source_path}")
        source_actual: Counter[tuple[str, Path]] = Counter()
        for label, target in re.findall(r"\[([^\]]+)\]\(([^)]+)\)", block.group(1)):
            raw_path = target.split("#", 1)[0]
            target_path = (source_path.parent / raw_path).resolve() if raw_path else source_path
            try:
                target_path.relative_to(guide_root.resolve())
            except ValueError:
                fail(f"navigation: source relation escapes Guidebook root: {source_path} -> {target}")
            source_actual[(normalized_text(label), target_path)] += 1
        missing_source = Counter(required) - source_actual
        if missing_source:
            fail(
                "navigation: README-required source relation omitted or drifted: "
                f"{source_path}: {dict(missing_source)}"
            )
        for label, target_path in required:
            relations.append(
                {
                    "source_website": website_name_for_source(source_path),
                    "target_website": website_name_for_source(target_path),
                    "target_id": rendered_id_for_source(target_path),
                    "label": normalized_text(label),
                }
            )
    return relations


def scoped_navigation_relations(
    relations: list[dict[str, str]], website_documents: dict[str, LinkDocumentParser]
) -> list[dict[str, str]]:
    names = set(website_documents)
    return [
        relation
        for relation in relations
        if relation["source_website"] in names and relation["target_website"] in names
    ]


def validate_website_navigation_relations(
    website_documents: dict[str, LinkDocumentParser], relations: list[dict[str, str]]
) -> None:
    for relation in relations:
        source_name = relation["source_website"]
        matching = [
            href
            for href, label in website_documents[source_name].anchors
            if label == relation["label"]
        ]
        valid = False
        for href in matching:
            target = internal_target(href)
            if target is None:
                continue
            raw_path, _ = target
            if posixpath.normpath(posixpath.join(posixpath.dirname(source_name), raw_path)) == relation[
                "target_website"
            ]:
                valid = True
                break
        if not valid:
            fail(
                "website: required source navigation relation omitted or drifted: "
                f"{source_name} --{relation['label']}--> {relation['target_website']}"
            )


def required_relation_counter(
    relations: list[dict[str, str]], target_kind: str
) -> Counter[tuple[str, str]]:
    return Counter((relation["label"], relation[target_kind]) for relation in relations)


def assert_relation_counter(
    label: str,
    required: Counter[tuple[str, str]],
    actual: Counter[tuple[str, str]],
) -> None:
    missing = required - actual
    if missing:
        fail(f"{label}: required source navigation relation omitted or drifted: {dict(missing)}")


def validate_rendered_navigation(
    website_files: list[Path], standalone_path: Path, pdf_path: Path, epub_path: Path
) -> int:
    website_documents = {
        path.name: parse_document(path.read_text(encoding="utf-8")) for path in website_files
    }
    relations = scoped_navigation_relations(source_navigation_relations(), website_documents)
    validate_website_navigation_relations(website_documents, relations)

    standalone = parse_document(standalone_path.read_text(encoding="utf-8"))
    standalone_actual = Counter(
        (label, internal_target(href)[1])
        for href, label in standalone.anchors
        if internal_target(href) is not None
    )
    assert_relation_counter(
        "standalone",
        required_relation_counter(relations, "target_id"),
        standalone_actual,
    )

    with zipfile.ZipFile(epub_path) as archive:
        epub_documents = [
            parse_document(archive.read(name).decode("utf-8"))
            for name in sorted(archive.namelist())
            if name.lower().endswith((".html", ".xhtml", ".htm"))
        ]
    epub_actual = Counter(
        (label, internal_target(href)[1])
        for document in epub_documents
        for href, label in document.anchors
        if internal_target(href) is not None
    )
    assert_relation_counter(
        "epub", required_relation_counter(relations, "target_id"), epub_actual
    )

    pdf_xml = subprocess.run(
        ["pdftohtml", "-xml", "-hidden", "-stdout", str(pdf_path)],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    pdf_document = parse_document(pdf_xml)
    pdf_text = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    normalized_pdf_text = normalized_text(re.sub(r"-\s+", "-", pdf_text))
    missing_pdf_labels = sorted(
        {relation["label"] for relation in relations if relation["label"] not in normalized_pdf_text}
    )
    if missing_pdf_labels:
        fail(f"pdf: required source navigation semantics missing: {missing_pdf_labels}")
    if not any(label == "Previous: Preface" for _, label in pdf_document.anchors):
        fail("pdf: Chapter 1 to Preface semantic link is not live")
    return len(relations)


def validate_navigation_omission_mutation(website_files: list[Path]) -> None:
    website_documents = {
        path.name: parse_document(path.read_text(encoding="utf-8")) for path in website_files
    }
    relations = scoped_navigation_relations(source_navigation_relations(), website_documents)
    chapter_one = "01-why-an-ai-workbench-not-another-chat-box.html"
    source_path = next((path for path in website_files if path.name == chapter_one), None)
    if source_path is None:
        fail("rendered navigation mutation: Chapter 1 Website document is missing")
    source = source_path.read_text(encoding="utf-8")
    mutated, replacements = re.subn(
        r'<a\s+href="[^"]+">Previous: Preface</a>',
        "Previous: Preface",
        source,
        count=1,
    )
    if replacements != 1:
        fail("rendered navigation mutation: Chapter 1 to Preface href not found")
    mutated_documents = dict(website_documents)
    mutated_documents[chapter_one] = parse_document(mutated)
    try:
        validate_website_navigation_relations(mutated_documents, relations)
    except RuntimeError:
        print("rendered-navigation-mutation=PASS cases=1 omission=chapter-1-to-preface")
        return
    fail("rendered navigation omission mutation unexpectedly passed")


def interrupt_matrix_contract() -> tuple[list[str], list[list[str]], list[str]]:
    guide_root = Path(__file__).resolve().parent.parent
    sidecar_path = guide_root / "assets/generated/ch-14-extra-01.md"
    source = sidecar_path.read_text(encoding="utf-8")
    front_matter = re.match(r"^---\n([\s\S]*?)\n---\n", source)
    if front_matter is None:
        fail("accessibility: missing ch-14-extra-01 sidecar front matter")
    lines = front_matter.group(1).splitlines()
    try:
        key_index = next(
            index for index, line in enumerate(lines) if line.strip() == "exact_text:"
        )
    except StopIteration:
        fail("accessibility: missing ch-14-extra-01 exact_text")
    values: list[str] = []
    for line in lines[key_index + 1 :]:
        match = re.match(r"^\s+-\s+(.+)$", line)
        if match is None:
            break
        values.append(match.group(1).strip().strip("'\""))
    if len(values) != 20:
        fail(f"accessibility: expected 20 interrupt matrix labels, found {len(values)}")
    row_values = values[3:-2]
    if len(row_values) != 15:
        fail("accessibility: expected five interrupt matrix rows")
    rows = [row_values[index : index + 3] for index in range(0, len(row_values), 3)]
    return values[:3], rows, values[-2:]


def validate_accessible_matrix(
    label: str, text: str, image_alts: list[str] | None = None
) -> None:
    headers, rows, invariants = interrupt_matrix_contract()
    rendered_text = normalized_text(text)
    for header in headers:
        if header not in rendered_text:
            fail(f"{label}: Figure 14.5 accessible text missing matrix header: {header}")
    for condition, handling, settlement in rows:
        mapping = f"{condition} → {handling} → {settlement}"
        if mapping not in rendered_text:
            fail(f"{label}: Figure 14.5 accessible mapping drift: {mapping}")
    for invariant in invariants:
        if invariant not in rendered_text:
            fail(f"{label}: Figure 14.5 accessible text missing invariant: {invariant}")
    if image_alts is None:
        return
    matching_alts = []
    for alt in image_alts:
        normalized_alt = normalized_text(alt)
        if all(header in normalized_alt for header in headers):
            matching_alts.append(normalized_alt)
    if len(matching_alts) != 1:
        fail(f"{label}: expected one Figure 14.5 matrix alt, found {len(matching_alts)}")
    matrix_alt = matching_alts[0]
    for condition, handling, settlement in rows:
        mapping = f"{condition} to {handling} to {settlement}"
        if mapping not in matrix_alt:
            fail(f"{label}: Figure 14.5 alt mapping drift: {mapping}")
    for invariant in invariants:
        if invariant not in matrix_alt:
            fail(f"{label}: Figure 14.5 alt missing invariant: {invariant}")


def validate_files(label: str, files: list[Path], root: Path) -> int:
    documents = {path.resolve(): parse_document(path.read_text(encoding="utf-8")) for path in files}
    checked = 0
    for source_path, document in documents.items():
        for href in document.hrefs:
            target = internal_target(href)
            if target is None:
                continue
            raw_path, fragment = target
            target_path = (source_path.parent / raw_path).resolve() if raw_path else source_path
            try:
                target_path.relative_to(root.resolve())
            except ValueError:
                fail(f"{label}: internal href escapes publication root: {source_path.name} -> {href}")
            if target_path not in documents:
                fail(f"{label}: missing internal href target: {source_path.name} -> {href}")
            if fragment and fragment not in documents[target_path].ids:
                fail(f"{label}: missing internal href fragment: {source_path.name} -> {href}")
            checked += 1
    return checked


def validate_epub(epub_path: Path) -> int:
    with zipfile.ZipFile(epub_path) as archive:
        names = set(archive.namelist())
        document_names = sorted(
            name for name in names if name.lower().endswith((".html", ".xhtml", ".htm"))
        )
        documents = {
            name: parse_document(archive.read(name).decode("utf-8")) for name in document_names
        }
        checked = 0
        for source_name, document in documents.items():
            for href in document.hrefs:
                target = internal_target(href)
                if target is None:
                    continue
                raw_path, fragment = target
                if raw_path.startswith("/"):
                    fail(f"epub: absolute internal href is not package-relative: {source_name} -> {href}")
                target_name = (
                    posixpath.normpath(posixpath.join(posixpath.dirname(source_name), raw_path))
                    if raw_path
                    else source_name
                )
                if target_name.startswith("../") or target_name not in names:
                    fail(f"epub: missing internal href target: {source_name} -> {href}")
                if fragment:
                    target_document = documents.get(target_name)
                    if target_document is None or fragment not in target_document.ids:
                        fail(f"epub: missing internal href fragment: {source_name} -> {href}")
                checked += 1
        return checked


def validate_rendered_accessibility(
    website_files: list[Path], standalone_path: Path, pdf_path: Path, epub_path: Path
) -> None:
    website_documents = [
        parse_document(path.read_text(encoding="utf-8")) for path in website_files
    ]
    validate_accessible_matrix(
        "website",
        " ".join(data for document in website_documents for data in document.text),
        [alt for document in website_documents for alt in document.image_alts],
    )
    standalone_document = parse_document(standalone_path.read_text(encoding="utf-8"))
    validate_accessible_matrix(
        "standalone",
        " ".join(standalone_document.text),
        standalone_document.image_alts,
    )
    with zipfile.ZipFile(epub_path) as archive:
        epub_documents = [
            parse_document(archive.read(name).decode("utf-8"))
            for name in sorted(archive.namelist())
            if name.lower().endswith((".html", ".xhtml", ".htm"))
        ]
    validate_accessible_matrix(
        "epub",
        " ".join(data for document in epub_documents for data in document.text),
        [alt for document in epub_documents for alt in document.image_alts],
    )
    pdf_text = subprocess.run(
        ["pdftotext", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    validate_accessible_matrix("pdf", pdf_text)


def validate_run5_formatted_text(
    website_files: list[Path], standalone_path: Path, pdf_path: Path, epub_path: Path
) -> None:
    def normalized_prose(source: str) -> str:
        return re.sub(r"\s+([.,;:!?])", r"\1", normalized_text(source))

    expected = normalized_prose(
        "Recovery must preserve the lifecycle generation and response command identity. "
        "The Uncertain branch points to Reconcile before any new side effect, never to "
        "Assume success or Repeat effect."
    )
    website_text = " ".join(
        data
        for path in website_files
        for data in parse_document(path.read_text(encoding="utf-8")).text
    )
    standalone_text = " ".join(
        parse_document(standalone_path.read_text(encoding="utf-8")).text
    )
    with zipfile.ZipFile(epub_path) as archive:
        epub_text = " ".join(
            data
            for name in sorted(archive.namelist())
            if name.lower().endswith((".html", ".xhtml", ".htm"))
            for data in parse_document(archive.read(name).decode("utf-8")).text
        )
    pdf_text = subprocess.run(
        ["pdftotext", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    for label, text in [
        ("website", website_text),
        ("standalone", standalone_text),
        ("epub", epub_text),
        ("pdf", pdf_text),
    ]:
        rendered = normalized_prose(text)
        if expected not in rendered:
            fail(f"{label}: Appendix B pending-interaction formatted text missing or collapsed")
        for forbidden in ["command. TheUncertainbranch", "TheUncertainbranch", "toReconcile"]:
            if forbidden in rendered:
                fail(f"{label}: Appendix B collapsed token spacing survived: {forbidden}")
    print("rendered-run5-formatted-text=PASS surfaces=website,standalone,PDF,EPUB")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("build_root", type=Path)
    parser.add_argument("--edition-name", default="haros-guidebook-pilot")
    parser.add_argument("--website-count", type=int, default=5)
    parser.add_argument("--test-navigation-omission", action="store_true")
    args = parser.parse_args()
    build_root = args.build_root.resolve()
    website_root = build_root / "website"
    standalone_path = build_root / f"{args.edition_name}.html"
    pdf_path = build_root / f"{args.edition_name}.pdf"
    epub_path = build_root / f"{args.edition_name}.epub"

    website_files = sorted(website_root.glob("*.html"))
    if len(website_files) != args.website_count:
        fail(
            f"website: expected {args.website_count} HTML documents, "
            f"found {len(website_files)}"
        )
    website_links = validate_files("website", website_files, website_root)
    standalone_links = validate_files("standalone", [standalone_path], build_root)
    epub_links = validate_epub(epub_path)
    navigation_relations = validate_rendered_navigation(
        website_files, standalone_path, pdf_path, epub_path
    )
    validate_rendered_accessibility(website_files, standalone_path, pdf_path, epub_path)
    if args.edition_name == "haros-guidebook":
        validate_run5_formatted_text(website_files, standalone_path, pdf_path, epub_path)
    print(
        "rendered-links=PASS "
        f"website={website_links} standalone={standalone_links} epub={epub_links}"
    )
    print(f"rendered-navigation-relations=PASS relations={navigation_relations} formats=4")
    print("rendered-accessibility=PASS formats=4 rows=5 invariants=2")
    if args.test_navigation_omission:
        validate_navigation_omission_mutation(website_files)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
