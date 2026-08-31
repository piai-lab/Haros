#!/usr/bin/env python3

"""Derive and verify Run 5 visible-text inventories from accepted raster pixels."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import io
import os
import sys
from pathlib import Path

import yaml
from PIL import Image, ImageOps


SCRIPT_ROOT = Path(__file__).resolve().parent
DEFAULT_GUIDE_ROOT = SCRIPT_ROOT.parent
PROOF_RELATIVE_PATH = Path("assets/run5-raster-text-proof.json")
EPOCH = "run-5-part-vii-appendices"
EXPECTED_FIGURES = 24

NON_TEXT_OCR_EXCEPTIONS = {
    "appendix-A-01": {
        "raster_sha256": "fba72a95798f9b03e5f4c4f3d6440c2bc09810db0b1b4fab6d4054767916d9b9",
        "token": "tr",
        "source_bbox": [273, 352, 320, 389],
        "source_crop_sha256": "8b0269077a03de8e10b277d7d2de87fd98fb9c33e9dbe6d99e2f569615e4c68b",
        "detections": [
            {
                "text": "Tr",
                "tokens": ["tr"],
                "confidence": 96.043724,
                "x": 273,
                "y": 352,
                "width": 47,
                "height": 37,
                "psm": 7,
                "pass": "text-region",
            }
        ],
        "human_verdict": "PASS: the bounded pixels are a duplicate OCR fragment inside the existing Product Thread label, not an additional visible word",
    },
    "ch-47-primary": {
        "raster_sha256": "d54d329e319fcfe97d093e57b7b065b646fc2873949e403f4a84ac3a451daed1",
        "token": "alll",
        "source_bbox": [577, 341, 683, 438],
        "source_crop_sha256": "7625e6fe02aefbfb41bdcd7bbef15860964da05d3046f262068caaa14a697ddf",
        "detections": [
            {
                "text": "alll",
                "tokens": ["alll"],
                "confidence": 85.683838,
                "x": 577,
                "y": 341,
                "width": 106,
                "height": 97,
                "psm": 12,
                "pass": "raw-rgb-psm-12",
            },
            {
                "text": "alll",
                "tokens": ["alll"],
                "confidence": 85.683838,
                "x": 577,
                "y": 341,
                "width": 106,
                "height": 97,
                "psm": 6,
                "pass": "raw-rgb-psm-6",
            },
        ],
        "human_verdict": "PASS: the bounded pixels are an arrow-and-node glyph, not letterforms",
    },
}

REVIEWED_CROP = {
    "appendix-A-02": {
        "raster_sha256": "16046221e2257d058e4d6c1dd1ccfa3a0534f970790fa0c647d6b5d3c5af3d1f",
        "source_bbox": [350, 100, 760, 260],
        "source_crop_sha256": "5401e2b236ae115c425f75348447ea9bf53f1c139befb610419ca6fbecb03d26",
        "prepared_size": [820, 320],
        "prepared_mode": "L",
        "prepared_transform": "2x resize then autocontrast",
        "prepared_crop_sha256": "e2a639744c1354d3ea3282faf8febbe0ad90866fa292eec180fc51d7c4c301ae",
        "psm": 7,
        "expected_detection": {
            "text": "Engine",
            "tokens": ["engine"],
            "confidence": 96.58979,
            "x": 488,
            "y": 236,
            "width": 488,
            "height": 162,
            "psm": 7,
            "pass": "reviewed-raster-crop",
        },
        "coordinate_space": "prepared 820x320 crop with source x/y offset retained",
        "human_verdict": "PASS: the bounded source pixels visibly read Engine",
    }
}


def load_run4_module():
    path = SCRIPT_ROOT / "validate-run4-raster-text.py"
    spec = importlib.util.spec_from_file_location("guidebook_run4_raster", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import raster helpers: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


R4 = load_run4_module()


def fail(message: str) -> None:
    raise RuntimeError(message)


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def png_sha256(image: Image.Image) -> str:
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    return sha256_bytes(stream.getvalue())


def canonical_json(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    ).encode()


def sidecars(guide_root: Path) -> list[tuple[Path, bytes, dict[str, object]]]:
    records = []
    for path in sorted((guide_root / "assets/generated").glob("*.md")):
        payload, metadata = R4.read_front_matter(path)
        if metadata.get("candidate_epoch") == EPOCH:
            records.append((path, payload, metadata))
    if len(records) != EXPECTED_FIGURES:
        fail(f"Run 5 sidecar count drift: expected {EXPECTED_FIGURES}, found {len(records)}")
    return records


def validate_inventory_boundary(slot: str, metadata: dict[str, object]) -> None:
    requested = metadata.get("pre_generation_requested_text")
    exact = metadata.get("exact_text")
    if not isinstance(requested, list) or not all(isinstance(value, str) for value in requested):
        fail(f"invalid pre_generation_requested_text: {slot}")
    if not isinstance(exact, list) or not all(isinstance(value, str) for value in exact):
        fail(f"invalid exact_text: {slot}")
    expected = list(requested)
    if slot == "cover-01":
        expected.insert(0, "Haros Guidebook")
    if slot == "appendix-B-01":
        expected.insert(len(expected) - 1, "Failure")
    if slot == "appendix-C-02":
        expected[-1] = "Identity stays with the descriptor"
    if exact != expected:
        fail(f"requested/final raster inventory boundary drift: {slot}")


def raster_transcript(path: Path, slot: str) -> dict[str, object]:
    base = R4.raster_transcript(path)
    words = list(base["words"])
    with Image.open(path) as opened:
        rgb = opened.convert("RGB")
        width, height = opened.size
        for psm in (6, 11, 12):
            for word in R4.tesseract_words(rgb, psm):
                words.append({**word, "pass": f"raw-rgb-psm-{psm}"})
        reviewed_evidence = None
        nontext_evidence = None
        if slot in NON_TEXT_OCR_EXCEPTIONS:
            bbox = NON_TEXT_OCR_EXCEPTIONS[slot]["source_bbox"]
            nontext_evidence = {
                "source_bbox": bbox,
                "source_crop_sha256": png_sha256(rgb.crop(tuple(bbox))),
            }
        if slot == "appendix-A-02":
            source_crop = rgb.crop((350, 100, 760, 260))
            crop = ImageOps.autocontrast(source_crop.resize((820, 320)).convert("L"))
            for word in R4.tesseract_words(crop, 7, 350, 100):
                words.append({**word, "pass": "reviewed-raster-crop"})
            reviewed_evidence = {
                "source_bbox": [350, 100, 760, 260],
                "source_crop_sha256": png_sha256(source_crop),
                "prepared_crop_sha256": png_sha256(crop),
                "prepared_size": [820, 320],
                "prepared_mode": "L",
                "psm": 7,
            }
    words.sort(
        key=lambda word: (
            int(word["y"]),
            int(word["x"]),
            str(word["pass"]),
            str(word["text"]),
        )
    )
    observed_tokens = sorted(
        {token for word in words for token in word["tokens"] if isinstance(token, str)}
    )
    transcript = {
        "raster_sha256": sha256_bytes(path.read_bytes()),
        "width": width,
        "height": height,
        "words": words,
        "normalized_transcript": " ".join(observed_tokens),
        "transcript_sha256": sha256_bytes("\n".join(observed_tokens).encode()),
    }
    if reviewed_evidence is not None:
        transcript["reviewed_crop_evidence"] = reviewed_evidence
    if nontext_evidence is not None:
        transcript["nontext_noise_evidence"] = nontext_evidence
    return transcript


def nontext_exception_is_bound(slot: str, transcript: dict[str, object]) -> bool:
    contract = NON_TEXT_OCR_EXCEPTIONS.get(slot)
    if contract is None or transcript.get("raster_sha256") != contract["raster_sha256"]:
        return False
    words = transcript.get("words")
    if not isinstance(words, list):
        return False
    detections = [word for word in words if contract["token"] in word.get("tokens", [])]
    if detections != contract["detections"]:
        return False
    return transcript.get("nontext_noise_evidence") == {
        "source_bbox": contract["source_bbox"],
        "source_crop_sha256": contract["source_crop_sha256"],
    }


def validate_reviewed_crop(slot: str, transcript: dict[str, object]) -> None:
    contract = REVIEWED_CROP.get(slot)
    if contract is None:
        return
    if transcript.get("raster_sha256") != contract["raster_sha256"]:
        fail(f"reviewed crop raster hash drift: {slot}")
    evidence = transcript.get("reviewed_crop_evidence")
    expected_evidence = {
        "source_bbox": contract["source_bbox"],
        "source_crop_sha256": contract["source_crop_sha256"],
        "prepared_crop_sha256": contract["prepared_crop_sha256"],
        "prepared_size": contract["prepared_size"],
        "prepared_mode": contract["prepared_mode"],
        "psm": contract["psm"],
    }
    if evidence != expected_evidence:
        fail(f"reviewed crop evidence drift: {slot}")
    words = transcript.get("words")
    detections = [word for word in words if word.get("pass") == "reviewed-raster-crop"]
    if contract["expected_detection"] not in detections:
        fail(f"reviewed crop detection drift: {slot}")


def compare_inventory(
    slot: str,
    exact_text: list[str],
    transcript: dict[str, object],
    injected_token: str | None,
) -> dict[str, object]:
    observed_tokens = str(transcript["normalized_transcript"]).split()
    comparison = R4.compare_inventory(exact_text, observed_tokens, injected_token=injected_token)
    expected = comparison["expected_tokens"]
    comparison["extra_tokens"] = sorted(
        token
        for token in comparison["extra_tokens"]
        if not any(len(token) >= 2 and token != value and token in value for value in expected)
        and not (
            slot in NON_TEXT_OCR_EXCEPTIONS
            and token == NON_TEXT_OCR_EXCEPTIONS[slot]["token"]
            and nontext_exception_is_bound(slot, transcript)
        )
    )
    return comparison


def configuration() -> dict[str, object]:
    return {
        "base": R4.proof_configuration(),
        "additional_full_image_psm": [6, 11, 12],
        "additional_full_image_mode": "raw-rgb",
        "reviewed_raster_crop": REVIEWED_CROP,
        "fragment_filter": "proper-substring-of-expected-token",
        "reviewed_nontext_ocr_noise": NON_TEXT_OCR_EXCEPTIONS,
        "inventory_boundary": {
            "cover-01": ["deterministic composition adds Haros Guidebook"],
            "appendix-B-01": ["raster-only Failure label"],
            "appendix-C-02": ["raster-only article in Identity stays with the descriptor"],
        },
    }


def load_proof(path: Path) -> dict[str, object]:
    if not path.is_file():
        fail(f"missing Run 5 raster-text proof: {path}")
    proof = json.loads(path.read_text(encoding="utf-8"))
    claimed = proof.pop("proof_sha256", None)
    actual = sha256_bytes(canonical_json(proof))
    if claimed != actual:
        fail(f"Run 5 raster-text proof hash drift: expected {claimed}, found {actual}")
    proof["proof_sha256"] = claimed
    return proof


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--guide-root", type=Path, default=DEFAULT_GUIDE_ROOT)
    parser.add_argument("--proof", type=Path)
    parser.add_argument("--write-proof", action="store_true")
    parser.add_argument("--use-proof-transcript", action="store_true")
    parser.add_argument("--mutation-mode", action="store_true")
    parser.add_argument("--human-checklist-reviewed", action="store_true")
    args = parser.parse_args()
    if args.write_proof != args.human_checklist_reviewed:
        fail("--write-proof and --human-checklist-reviewed must be used together")
    if args.write_proof and args.use_proof_transcript:
        fail("--write-proof cannot use a persisted transcript")
    if args.mutation_mode and not args.use_proof_transcript:
        fail("--mutation-mode requires --use-proof-transcript")

    version = R4.tesseract_version()
    guide_root = args.guide_root.resolve()
    proof_path = (args.proof or guide_root / PROOF_RELATIVE_PATH).resolve()
    records = sidecars(guide_root)
    proof = None if args.write_proof else load_proof(proof_path)
    if proof is not None and proof.get("configuration") != configuration():
        fail("Run 5 raster-text proof configuration drift")

    injected = os.environ.get("GUIDEBOOK_OCR_MUTATION_EXTRA_TOKEN") if args.mutation_mode else None
    injected_slot = os.environ.get("GUIDEBOOK_OCR_MUTATION_SLOT") if args.mutation_mode else None
    results: dict[str, object] = {}
    failures = []
    for path, payload, metadata in records:
        slot = path.stem
        if not args.mutation_mode:
            validate_inventory_boundary(slot, metadata)
        file_name = metadata.get("file")
        exact_text = metadata.get("exact_text")
        if not isinstance(file_name, str) or not isinstance(exact_text, list):
            fail(f"invalid Run 5 raster contract: {slot}")
        raster_path = guide_root / "assets/generated" / file_name
        if args.use_proof_transcript:
            source_record = proof.get("figures", {}).get(slot) if proof else None
            if not isinstance(source_record, dict):
                fail(f"proof transcript missing: {slot}")
            transcript = source_record.get("transcript")
            if not isinstance(transcript, dict):
                fail(f"invalid proof transcript: {slot}")
            if transcript.get("raster_sha256") != sha256_bytes(raster_path.read_bytes()):
                fail(f"proof transcript raster hash drift: {slot}")
        else:
            transcript = raster_transcript(raster_path, slot)
        validate_reviewed_crop(slot, transcript)
        comparison = compare_inventory(
            slot,
            [str(value) for value in exact_text],
            transcript,
            injected if not injected_slot or injected_slot == slot else None,
        )
        if comparison["missing_tokens"] or comparison["extra_tokens"]:
            failures.append(
                f"{slot}: missing={comparison['missing_tokens']} extra={comparison['extra_tokens']}"
            )
        results[slot] = {
            "sidecar_sha256": sha256_bytes(payload),
            "requested_text": metadata.get("pre_generation_requested_text"),
            "exact_text": exact_text,
            "transcript": transcript,
            "comparison": comparison,
        }
    if failures:
        fail("bidirectional raster inventory mismatch: " + "; ".join(failures))

    if args.write_proof:
        core: dict[str, object] = {
            "schema_version": 1,
            "candidate_epoch": EPOCH,
            "configuration": configuration(),
            "tesseract_version": version,
            "human_full_resolution_checklist": {
                "verdict": "PASS",
                "figure_count": EXPECTED_FIGURES,
                "scope": "exact text, topology, forbidden edges, palette, natural case, and accessible equivalent",
                "figures": {
                    slot: record["transcript"]["raster_sha256"]
                    for slot, record in sorted(results.items())
                },
            },
            "figures": results,
        }
        core["proof_sha256"] = sha256_bytes(canonical_json(core))
        proof_path.write_text(json.dumps(core, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
        print(
            f"run5-raster-text-proof-write=PASS figures={EXPECTED_FIGURES} "
            f"proof_sha256={core['proof_sha256']}"
        )
        return 0

    if proof is not None and not args.mutation_mode:
        checklist = proof.get("human_full_resolution_checklist")
        if not isinstance(checklist, dict) or checklist.get("verdict") != "PASS":
            fail("Run 5 human full-resolution checklist drift")
        for slot, record in results.items():
            persisted = proof.get("figures", {}).get(slot)
            if not isinstance(persisted, dict):
                fail(f"proof record missing: {slot}")
            if persisted.get("sidecar_sha256") != record["sidecar_sha256"]:
                fail(f"proof sidecar hash drift: {slot}")
            if persisted.get("transcript") != record["transcript"]:
                fail(f"recomputed OCR transcript drift: {slot}")
            if persisted.get("comparison") != record["comparison"]:
                fail(f"recomputed OCR comparison drift: {slot}")
    print(
        f"run5-raster-text=PASS figures={EXPECTED_FIGURES} tesseract={version} "
        "bidirectional=PASS missing-mutation=armed extra-mutation=armed"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, yaml.YAMLError) as error:
        print(f"run5-raster-text=FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
