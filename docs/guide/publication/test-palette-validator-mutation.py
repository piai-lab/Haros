#!/usr/bin/env python3
"""Prove that saturated purple/neon/multicolor pixels cannot false-green."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np


SCRIPT = Path(__file__).with_name("validate-generated-palette.py")
SPEC = importlib.util.spec_from_file_location("validate_generated_palette", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)

synthetic = np.full((128, 128, 3), 250, dtype=np.uint8)
synthetic[8:56, 8:40] = (149, 101, 241)  # saturated purple/neon
synthetic[8:56, 48:80] = (85, 110, 190)  # saturated royal blue
synthetic[8:56, 88:120] = (2, 118, 2)  # bright green
metrics = VALIDATOR.analyze_rgb(synthetic)
try:
    VALIDATOR.enforce_metrics(metrics, "in-memory-saturated-purple-neon-multicolor")
except RuntimeError:
    print("palette-validator-mutation=PASS cases=1 source=in-memory-saturated-raster")
else:
    raise SystemExit("saturated palette mutation unexpectedly passed")
