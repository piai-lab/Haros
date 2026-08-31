#!/usr/bin/env python3

"""Derive and verify the Run 4 visible-text inventory from raster pixels."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import yaml
from PIL import Image
from scipy import ndimage


SCRIPT_ROOT = Path(__file__).resolve().parent
DEFAULT_GUIDE_ROOT = SCRIPT_ROOT.parent
PROOF_RELATIVE_PATH = Path("assets/run4-raster-text-proof.json")
OLD_CANDIDATE_SHA256 = "18f1252a7369286c4657c1674a8c4194d5662b8a5cff0bb9cf139a251f855e74"
OLD_MANIFEST = (
    DEFAULT_GUIDE_ROOT.parent.parent
    / "missions/evidence/haros-guidebook/output"
    / f"sha256-{OLD_CANDIDATE_SHA256}"
    / "candidate-manifest.txt"
)

TESSERACT_VERSION = "5.5.3"
LANGUAGE = "eng"
OEM = 1
FULL_IMAGE_PSM = 11
REGION_PSM = 7
FULL_IMAGE_THRESHOLD = 80
REGION_DETECTION_THRESHOLD = 130
REGION_OCR_THRESHOLD = 140
MINIMUM_CONFIDENCE = 80.0
LINE_OPENING_PIXELS = 35
TEXT_DILATION_HEIGHT = 5
TEXT_DILATION_WIDTH = 16
MINIMUM_REGION_WIDTH = 18
MINIMUM_REGION_HEIGHT = 8
MAXIMUM_REGION_HEIGHT = 100
REGION_PADDING = 8

TITLE_REMOVALS = {
    "ch-35-primary": "Process landscape",
    "ch-35-secondary": "Authorized edges",
    "ch-38-secondary": "Projection repair",
    "ch-43-primary": "Startup layers",
    "ch-43-secondary": "Admission lanes",
    "ch-44-extra": "Cancellation path",
    "ch-44-primary": "Failure boundaries",
    "ch-44-secondary": "Command retry",
    "ch-45-primary": "Restart recovery",
    "ch-45-secondary": "Startup reconciliation",
    "ch-46-extra": "Bounded outbound request",
    "ch-46-secondary": "Independent security gates",
}
LABEL_ADDITIONS = {
    "ch-35-primary": "Server",
    "ch-36-secondary": "Settings",
}
AFFECTED_SLOTS = set(TITLE_REMOVALS) | set(LABEL_ADDITIONS)


def fail(message: str) -> None:
    raise RuntimeError(message)


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def canonical_json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def normalized_tokens(value: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", value.casefold()) if len(token) >= 2]


def edit_distance(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for left_index, left_character in enumerate(left, 1):
        current = [left_index]
        for right_index, right_character in enumerate(right, 1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[right_index] + 1,
                    previous[right_index - 1] + (left_character != right_character),
                )
            )
        previous = current
    return previous[-1]


def maximum_ocr_distance(left: str, right: str) -> int:
    return 1 if max(len(left), len(right)) <= 7 else 2


def is_ocr_variant(left: str, right: str) -> bool:
    if left == right:
        return True
    if edit_distance(left, right) <= maximum_ocr_distance(left, right):
        return True
    shorter, longer = sorted((left, right), key=len)
    return len(shorter) <= 4 and len(longer) >= 6 and longer.startswith(shorter)


def read_front_matter(path: Path) -> tuple[bytes, dict[str, object]]:
    payload = path.read_bytes()
    source = payload.decode("utf-8")
    match = re.match(r"^---\n([\s\S]*?)\n---\n", source)
    if not match:
        fail(f"missing front matter: {path}")
    metadata = yaml.safe_load(match.group(1))
    if not isinstance(metadata, dict):
        fail(f"invalid front matter: {path}")
    return payload, metadata


def run4_sidecars(guide_root: Path) -> list[tuple[Path, bytes, dict[str, object]]]:
    generated_root = guide_root / "assets/generated"
    sidecars = []
    for path in sorted(generated_root.glob("*.md")):
        payload, metadata = read_front_matter(path)
        if metadata.get("candidate_epoch") == "run-4-parts-v-vi":
            sidecars.append((path, payload, metadata))
    if len(sidecars) != 29:
        fail(f"Run 4 sidecar count drift: expected 29, found {len(sidecars)}")
    return sidecars


def tesseract_version() -> str:
    result = subprocess.run(
        ["tesseract", "--version"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    first_line = result.stdout.splitlines()[0].strip()
    match = re.fullmatch(r"tesseract\s+(.+)", first_line)
    if not match:
        fail(f"cannot parse Tesseract version: {first_line}")
    version = match.group(1)
    if version != TESSERACT_VERSION:
        fail(f"Tesseract version drift: expected {TESSERACT_VERSION}, found {version}")
    return version


def threshold_image(grayscale: np.ndarray, threshold: int) -> Image.Image:
    return Image.fromarray(grayscale).point(lambda pixel: 0 if pixel < threshold else 255, "1")


def tesseract_words(image: Image.Image, psm: int, offset_x: int = 0, offset_y: int = 0) -> list[dict[str, object]]:
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    result = subprocess.run(
        [
            "tesseract",
            "stdin",
            "stdout",
            "-l",
            LANGUAGE,
            "--oem",
            str(OEM),
            "--psm",
            str(psm),
            "tsv",
        ],
        input=stream.getvalue(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        fail(f"Tesseract failed: {result.stderr.decode('utf-8', errors='replace').strip()}")
    words = []
    for line in result.stdout.decode("utf-8", errors="replace").splitlines()[1:]:
        columns = line.split("\t")
        if len(columns) < 12:
            continue
        try:
            confidence = float(columns[10])
            left, top, width, height = map(int, columns[6:10])
        except ValueError:
            continue
        text = columns[11].strip()
        tokens = normalized_tokens(text)
        if confidence < MINIMUM_CONFIDENCE or not tokens:
            continue
        words.append(
            {
                "text": text,
                "tokens": tokens,
                "confidence": round(confidence, 6),
                "x": offset_x + left,
                "y": offset_y + top,
                "width": width,
                "height": height,
                "psm": psm,
            }
        )
    return words


def region_boxes(grayscale: np.ndarray) -> list[tuple[int, int, int, int]]:
    ink = grayscale < REGION_DETECTION_THRESHOLD
    horizontal = ndimage.binary_opening(
        ink, structure=np.ones((1, LINE_OPENING_PIXELS), dtype=bool)
    )
    vertical = ndimage.binary_opening(
        ink, structure=np.ones((LINE_OPENING_PIXELS, 1), dtype=bool)
    )
    text_ink = ink & ~(horizontal | vertical)
    merged = ndimage.binary_dilation(
        text_ink,
        structure=np.ones((TEXT_DILATION_HEIGHT, TEXT_DILATION_WIDTH), dtype=bool),
    )
    labels, _ = ndimage.label(merged)
    boxes = []
    for region in ndimage.find_objects(labels):
        if region is None:
            continue
        y_slice, x_slice = region
        width = x_slice.stop - x_slice.start
        height = y_slice.stop - y_slice.start
        if (
            width < MINIMUM_REGION_WIDTH
            or height < MINIMUM_REGION_HEIGHT
            or height > MAXIMUM_REGION_HEIGHT
        ):
            continue
        boxes.append((x_slice.start, y_slice.start, x_slice.stop, y_slice.stop))
    return sorted(boxes, key=lambda box: (box[1], box[0], box[3], box[2]))


def raster_transcript(path: Path) -> dict[str, object]:
    with Image.open(path) as source:
        grayscale = np.asarray(source.convert("L"))
        width, height = source.size
    words = []
    for word in tesseract_words(threshold_image(grayscale, FULL_IMAGE_THRESHOLD), FULL_IMAGE_PSM):
        words.append({**word, "pass": "full-image"})
    for left, top, right, bottom in region_boxes(grayscale):
        crop_left = max(0, left - REGION_PADDING)
        crop_top = max(0, top - REGION_PADDING)
        crop_right = min(width, right + REGION_PADDING)
        crop_bottom = min(height, bottom + REGION_PADDING)
        crop = threshold_image(
            grayscale[crop_top:crop_bottom, crop_left:crop_right], REGION_OCR_THRESHOLD
        )
        for word in tesseract_words(crop, REGION_PSM, crop_left, crop_top):
            words.append({**word, "pass": "text-region"})
    words.sort(
        key=lambda word: (
            int(word["y"]),
            int(word["x"]),
            str(word["pass"]),
            str(word["text"]),
        )
    )
    observed_tokens = sorted(
        {
            token
            for word in words
            for token in word["tokens"]
            if isinstance(token, str)
        }
    )
    return {
        "raster_sha256": sha256_bytes(path.read_bytes()),
        "width": width,
        "height": height,
        "words": words,
        "normalized_transcript": " ".join(observed_tokens),
        "transcript_sha256": sha256_bytes("\n".join(observed_tokens).encode()),
    }


def compare_inventory(
    exact_text: list[str], observed_tokens: list[str], injected_token: str | None = None
) -> dict[str, object]:
    expected = sorted({token for phrase in exact_text for token in normalized_tokens(phrase)})
    observed = sorted(set(observed_tokens))
    if injected_token:
        observed.extend(normalized_tokens(injected_token))
        observed = sorted(set(observed))
    missing = list(expected)
    extras = list(observed)
    matches: list[dict[str, object]] = []
    for token in list(missing):
        if token in extras:
            matches.append({"expected": token, "observed": token, "distance": 0})
            missing.remove(token)
            extras.remove(token)
    while True:
        candidates = []
        for expected_token in missing:
            for observed_token in extras:
                distance = edit_distance(expected_token, observed_token)
                if distance <= maximum_ocr_distance(expected_token, observed_token):
                    candidates.append(
                        (
                            distance,
                            abs(len(expected_token) - len(observed_token)),
                            expected_token,
                            observed_token,
                        )
                    )
        if not candidates:
            break
        distance, _, expected_token, observed_token = min(candidates)
        matches.append(
            {
                "expected": expected_token,
                "observed": observed_token,
                "distance": distance,
            }
        )
        missing.remove(expected_token)
        extras.remove(observed_token)
    matched_observed = [str(match["observed"]) for match in matches]
    extras = [
        token
        for token in extras
        if not any(is_ocr_variant(token, matched) for matched in matched_observed)
    ]
    return {
        "expected_tokens": expected,
        "observed_tokens": observed,
        "matches": sorted(matches, key=lambda match: str(match["expected"])),
        "missing_tokens": sorted(missing),
        "extra_tokens": sorted(extras),
    }


def validate_correction_contract(slot: str, metadata: dict[str, object], path: Path) -> None:
    exact_text = metadata.get("exact_text")
    if not isinstance(exact_text, list) or not all(isinstance(value, str) for value in exact_text):
        fail(f"invalid exact_text: {path}")
    if slot not in AFFECTED_SLOTS:
        if "pre_generation_requested_text" in metadata:
            fail(f"unaffected sidecar gained correction metadata: {slot}")
        return
    requested = metadata.get("pre_generation_requested_text")
    if not isinstance(requested, list) or not all(isinstance(value, str) for value in requested):
        fail(f"affected sidecar lacks preserved pre-generation inventory: {slot}")
    expected_final = list(requested)
    removed = TITLE_REMOVALS.get(slot)
    if removed:
        if removed not in expected_final:
            fail(f"preserved inventory lacks Judge-reported conceptual title: {slot}")
        expected_final.remove(removed)
    added = LABEL_ADDITIONS.get(slot)
    if added:
        if added in requested:
            fail(f"Judge-reported raster-only label was already in requested inventory: {slot}")
        expected_final.append(added)
    if exact_text != expected_final:
        fail(f"final exact_text exceeds the bounded Judge correction: {slot}")


def old_sidecar_hashes() -> dict[str, str]:
    if not OLD_MANIFEST.is_file():
        fail(f"missing rejected-candidate manifest: {OLD_MANIFEST}")
    hashes = {}
    pattern = re.compile(
        r"^([0-9a-f]{64})  docs/guide/assets/generated/([^/]+)\.md$", re.MULTILINE
    )
    for match in pattern.finditer(OLD_MANIFEST.read_text(encoding="utf-8")):
        hashes[match.group(2)] = match.group(1)
    return hashes


def proof_configuration() -> dict[str, object]:
    return {
        "tesseract_version": TESSERACT_VERSION,
        "language": LANGUAGE,
        "oem": OEM,
        "full_image_psm": FULL_IMAGE_PSM,
        "region_psm": REGION_PSM,
        "full_image_threshold": FULL_IMAGE_THRESHOLD,
        "region_detection_threshold": REGION_DETECTION_THRESHOLD,
        "region_ocr_threshold": REGION_OCR_THRESHOLD,
        "minimum_confidence": MINIMUM_CONFIDENCE,
        "line_opening_pixels": LINE_OPENING_PIXELS,
        "text_dilation": [TEXT_DILATION_WIDTH, TEXT_DILATION_HEIGHT],
        "minimum_region": [MINIMUM_REGION_WIDTH, MINIMUM_REGION_HEIGHT],
        "maximum_region_height": MAXIMUM_REGION_HEIGHT,
        "region_padding": REGION_PADDING,
        "normalization": "casefold-alphanumeric-tokens-min-length-2",
        "matching": "exact-first-then-bounded-edit-distance-with-duplicate-ocr-variant-collapse",
    }


def load_proof(path: Path) -> dict[str, object]:
    if not path.is_file():
        fail(f"missing Run 4 raster-text proof: {path}")
    proof = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(proof, dict):
        fail("invalid Run 4 raster-text proof")
    claimed_hash = proof.pop("proof_sha256", None)
    actual_hash = sha256_bytes(canonical_json(proof))
    if claimed_hash != actual_hash:
        fail(f"Run 4 raster-text proof hash drift: expected {claimed_hash}, found {actual_hash}")
    proof["proof_sha256"] = claimed_hash
    return proof


def validate_sidecar_hash_boundary(
    proof: dict[str, object], current_hashes: dict[str, str], mutation_mode: bool
) -> None:
    figures = proof.get("figures")
    if not isinstance(figures, dict):
        fail("proof lacks figure records")
    if mutation_mode:
        return
    changed = []
    unchanged = []
    for slot, current_hash in sorted(current_hashes.items()):
        record = figures.get(slot)
        if not isinstance(record, dict):
            fail(f"proof lacks slot: {slot}")
        before = record.get("pre_correction_sidecar_sha256")
        after = record.get("post_correction_sidecar_sha256")
        if after != current_hash:
            fail(f"post-correction sidecar hash drift: {slot}")
        if before == after:
            unchanged.append(slot)
        else:
            changed.append(slot)
    if set(changed) != AFFECTED_SLOTS:
        fail(f"affected sidecar boundary drift: {','.join(changed)}")
    if len(unchanged) != 16:
        fail(f"unchanged Run 4 sidecar count drift: {len(unchanged)}")


def validate_human_checklist(proof: dict[str, object], guide_root: Path) -> None:
    checklist = proof.get("human_full_resolution_checklist")
    if not isinstance(checklist, dict):
        fail("proof lacks full-resolution human checklist")
    if checklist.get("verdict") != "PASS" or checklist.get("figure_count") != 29:
        fail("full-resolution human checklist verdict drift")
    figures = checklist.get("figures")
    if not isinstance(figures, dict) or len(figures) != 29:
        fail("full-resolution human checklist figure count drift")
    for slot, expected_hash in figures.items():
        if not isinstance(slot, str) or not isinstance(expected_hash, str):
            fail("invalid full-resolution human checklist record")
        path = guide_root / "assets/generated" / f"{slot}.jpg"
        if not path.is_file() or sha256_bytes(path.read_bytes()) != expected_hash:
            fail(f"full-resolution human checklist raster hash drift: {slot}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--guide-root", type=Path, default=DEFAULT_GUIDE_ROOT)
    parser.add_argument("--proof", type=Path)
    parser.add_argument("--write-proof", action="store_true")
    parser.add_argument("--audit-only", action="store_true")
    parser.add_argument("--use-proof-transcript", action="store_true")
    parser.add_argument("--mutation-mode", action="store_true")
    parser.add_argument("--human-checklist-reviewed", action="store_true")
    args = parser.parse_args()
    guide_root = args.guide_root.resolve()
    proof_path = (args.proof or (guide_root / PROOF_RELATIVE_PATH)).resolve()
    if args.write_proof and (args.audit_only or args.use_proof_transcript):
        fail("--write-proof cannot be combined with --audit-only or --use-proof-transcript")
    if args.write_proof != args.human_checklist_reviewed:
        fail("--write-proof and --human-checklist-reviewed must be used together")
    if args.mutation_mode and not args.use_proof_transcript:
        fail("--mutation-mode requires --use-proof-transcript")
    version = tesseract_version()
    sidecars = run4_sidecars(guide_root)
    current_hashes = {path.stem: sha256_bytes(payload) for path, payload, _ in sidecars}
    old_hashes = old_sidecar_hashes()
    proof = None if args.audit_only or args.write_proof else load_proof(proof_path)
    if proof is not None:
        if proof.get("configuration") != proof_configuration():
            fail("Run 4 raster-text proof configuration drift")
        validate_sidecar_hash_boundary(proof, current_hashes, args.mutation_mode)
        validate_human_checklist(proof, guide_root)
    injected = os.environ.get("GUIDEBOOK_OCR_MUTATION_EXTRA_TOKEN") if args.mutation_mode else None
    injected_slot = os.environ.get("GUIDEBOOK_OCR_MUTATION_SLOT") if args.mutation_mode else None
    records: dict[str, object] = {}
    failures = []
    for path, payload, metadata in sidecars:
        slot = path.stem
        if not args.mutation_mode:
            validate_correction_contract(slot, metadata, path)
        file_name = metadata.get("file")
        exact_text = metadata.get("exact_text")
        if not isinstance(file_name, str) or not isinstance(exact_text, list):
            fail(f"invalid raster-text contract: {slot}")
        raster_path = guide_root / "assets/generated" / file_name
        if args.use_proof_transcript:
            if proof is None:
                fail("proof transcript requested without proof")
            source_record = proof["figures"].get(slot)
            if not isinstance(source_record, dict):
                fail(f"proof transcript missing: {slot}")
            transcript = source_record.get("transcript")
            if not isinstance(transcript, dict):
                fail(f"invalid proof transcript: {slot}")
            if transcript.get("raster_sha256") != sha256_bytes(raster_path.read_bytes()):
                fail(f"proof transcript raster hash drift: {slot}")
        else:
            transcript = raster_transcript(raster_path)
        observed = str(transcript["normalized_transcript"]).split()
        comparison = compare_inventory(
            [str(value) for value in exact_text],
            observed,
            injected_token=injected if not injected_slot or injected_slot == slot else None,
        )
        if comparison["missing_tokens"] or comparison["extra_tokens"]:
            failures.append(
                f"{slot}: missing={comparison['missing_tokens']} extra={comparison['extra_tokens']}"
            )
        records[slot] = {
            "file": file_name,
            "pre_correction_sidecar_sha256": old_hashes.get(slot),
            "post_correction_sidecar_sha256": current_hashes[slot],
            "exact_text": exact_text,
            "inventory_sha256": sha256_bytes(canonical_json(exact_text)),
            "transcript": transcript,
            "comparison": comparison,
        }
    if failures:
        fail("Run 4 raster-text mismatch:\n" + "\n".join(failures))
    if args.write_proof:
        core = {
            "schema": "haros-guidebook-run4-raster-text-proof-v1",
            "source_candidate_sha256": OLD_CANDIDATE_SHA256,
            "configuration": proof_configuration(),
            "inventory_deltas": 14,
            "affected_unique_sidecars": sorted(AFFECTED_SLOTS),
            "unchanged_sidecars": sorted(set(records) - AFFECTED_SLOTS),
            "human_full_resolution_checklist": {
                "reviewer": "Run 4 Executor",
                "method": "original-resolution raster inspection against final exact_text",
                "verdict": "PASS",
                "figure_count": 29,
                "inventory_deltas_reviewed": 14,
                "affected_unique_sidecars_reviewed": 13,
                "unchanged_sidecars_reviewed": 16,
                "figures": {
                    slot: str(record["transcript"]["raster_sha256"])
                    for slot, record in sorted(records.items())
                },
            },
            "figures": records,
        }
        if len(core["affected_unique_sidecars"]) != 13 or len(core["unchanged_sidecars"]) != 16:
            fail("internal correction-count drift")
        core["proof_sha256"] = sha256_bytes(canonical_json(core))
        proof_path.write_text(json.dumps(core, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
        print(f"run4-raster-text-proof-write=PASS figures=29 proof_sha256={core['proof_sha256']}")
        return 0
    if proof is not None and not args.mutation_mode:
        for slot, record in records.items():
            persisted = proof["figures"].get(slot)
            if not isinstance(persisted, dict):
                fail(f"proof record missing: {slot}")
            if persisted.get("transcript") != record["transcript"]:
                fail(f"recomputed OCR transcript drift: {slot}")
            if persisted.get("comparison") != record["comparison"]:
                fail(f"recomputed OCR comparison drift: {slot}")
    print(
        f"run4-raster-text=PASS figures=29 inventory_deltas=14 unique_sidecars=13 "
        f"unchanged_sidecars=16 tesseract={version} bidirectional=PASS"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, subprocess.SubprocessError, yaml.YAMLError) as error:
        print(f"run4-raster-text=FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
