#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
temp_root="$(mktemp -d /tmp/haros-guidebook-run5-mutations.XXXXXX)"
trap 'rm -rf -- "$temp_root"' EXIT

reset_fixture() {
  rm -rf -- "$temp_root/guide"
  cp -R "$guide_root" "$temp_root/guide"
}

expect_fixture_failure() {
  local label="$1"
  if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" \
    node "$script_dir/validate-run5.mjs" >/dev/null 2>&1; then
    echo "run5-validator-mutation=FAIL case=$label" >&2
    exit 1
  fi
}

reset_fixture
mv "$temp_root/guide/assets/generated/appendix-H-01.md" \
  "$temp_root/appendix-H-01.removed"
expect_fixture_failure "missing-slot"

reset_fixture
cp "$temp_root/guide/assets/generated/appendix-A-01.jpg" \
  "$temp_root/guide/assets/generated/appendix-Z-rogue.jpg"
cp "$temp_root/guide/assets/generated/appendix-A-01.md" \
  "$temp_root/guide/assets/generated/appendix-Z-rogue.md"
python3 - "$temp_root/guide/assets/generated/appendix-Z-rogue.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
source = source.replace("canonical_slot: appendix-A-01", "canonical_slot: appendix-Z-rogue", 1)
source = source.replace("file: appendix-A-01.jpg", "file: appendix-Z-rogue.jpg", 1)
path.write_text(source, encoding="utf-8")
PY
expect_fixture_failure "extra-slot"

reset_fixture
python3 - "$temp_root/guide/appendices/appendix-c-engine-capability-matrix.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = "|                2 | `codex`       | Codex"
if old not in source:
    raise SystemExit("Appendix C descriptor row anchor not found")
path.write_text(source.replace(old, "|                2 | `codex`       | CodeX", 1), encoding="utf-8")
PY
expect_fixture_failure "descriptor-row"

reset_fixture
python3 - "$temp_root/guide/appendices/appendix-h-edition-notes.md" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
start = source.find("| Candidate surface")
if start == -1:
    raise SystemExit("Appendix H table header anchor not found")
prefix = source[:start]
suffix = source[start:]
suffix, count = re.subn(
    r"^\|\s*-{3,}\s*\|\s*-{3,}\s*\|\s*-{3,}\s*\|$",
    "| -- | -- | -- |",
    suffix,
    count=1,
    flags=re.MULTILINE,
)
if count != 1:
    raise SystemExit("Appendix H table separator anchor not found")
path.write_text(prefix + suffix, encoding="utf-8")
PY
expect_fixture_failure "source-table-count"

reset_fixture
python3 - "$temp_root/guide/part-06-reliability/46-secrets-trust-local-boundaries.md" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
mutated, count = re.subn(
    r" · \[Next: Diagnostics, Usage, Retention, and Maintenance\]\([^\n]+\)",
    "",
    source,
    count=1,
)
if count != 1:
    raise SystemExit("Chapter 46 to 47 navigation anchor not found")
path.write_text(mutated, encoding="utf-8")
PY
expect_fixture_failure "chapter-46-next"

reset_fixture
python3 - "$temp_root/guide/appendices/appendix-b-lifecycle-reference.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = "Recovery must preserve the lifecycle generation and response command identity. The `Uncertain`\n  branch points to `Reconcile` before any new side effect, never to `Assume success` or\n  `Repeat effect`."
if old not in source:
    raise SystemExit("Appendix B recovery anchor not found")
path.write_text(source.replace(old, "lifecycle generation + response command<code>. The</code>Uncertain branch points to Reconcile.", 1), encoding="utf-8")
PY
expect_fixture_failure "appendix-b-orphan-code-spacing"

reset_fixture
python3 - "$temp_root/guide/appendices/appendix-b-lifecycle-reference.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = "Recovery must preserve the lifecycle generation and response command identity. The `Uncertain`\n  branch points to `Reconcile` before any new side effect, never to `Assume success` or\n  `Repeat effect`."
if old not in source:
    raise SystemExit("Appendix B recovery anchor not found")
path.write_text(source.replace(old, "Recovery keeps the command. TheUncertainbranch points toReconcile.", 1), encoding="utf-8")
PY
expect_fixture_failure "appendix-b-collapsed-text"

reset_fixture
python3 - "$temp_root/guide/appendices/appendix-e-source-map.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = "|      15 | Timeline, Activity, and Model Provenance                       | `packages/contracts/src/orchestration.ts`"
if old not in source:
    raise SystemExit("Appendix E Chapter 15 anchor not found")
path.write_text(source.replace(old, "|      15 | Timeline, Activity, and Model Provenance                       | `apps/web/src/workLog.ts`", 1), encoding="utf-8")
PY
expect_fixture_failure "appendix-e-ch15-consumer-as-owner"

reset_fixture
python3 - "$temp_root/guide/appendices/appendix-e-source-map.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = "`apps/server/src/engine/engineMaintenanceCommandCoordinator.ts`"
if old not in source:
    raise SystemExit("Appendix E Chapter 47 maintenance anchor not found")
path.write_text(source.replace(old, "`apps/server/src/engine/maintenance-missing.ts`", 1), encoding="utf-8")
PY
expect_fixture_failure "appendix-e-ch47-subdomain-route"

reset_fixture
field="$temp_root/guide/assets/generated/sources/cover-01-field.png"
magick "$field" -fill 'rgba(0,0,0,1)' -draw 'point 1,1' "$field.mutated.png"
mv "$field.mutated.png" "$field"
expect_fixture_failure "cover-field-pixel"

reset_fixture
mark_layer="$temp_root/guide/assets/generated/sources/cover-01-mark-layer.png"
magick "$mark_layer" -fill 'rgba(0,0,0,1)' -draw 'point 1,1' "$mark_layer.mutated.png"
mv "$mark_layer.mutated.png" "$mark_layer"
expect_fixture_failure "cover-mark-layer-pixel"

reset_fixture
python3 - "$temp_root/guide/assets/generated/sources/cover-01-composition.json" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
old = '"geometry": "+105+110"'
if old not in source:
    raise SystemExit("cover coordinate anchor not found")
path.write_text(source.replace(old, '"geometry": "+106+110"', 1), encoding="utf-8")
PY
expect_fixture_failure "cover-coordinate"

reset_fixture
final_cover="$temp_root/guide/assets/generated/cover-01.jpg"
magick "$final_cover" -fill black -draw 'point 1,1' -strip -quality 92 "$final_cover.mutated.jpg"
mv "$final_cover.mutated.jpg" "$final_cover"
expect_fixture_failure "cover-final-pixel"

bash "$script_dir/test-run5-raster-text-mutations.sh"

echo "run5-validator-mutations=PASS cases=16 missing-slot=1 extra-slot=1 descriptor=1 source-table=1 navigation=1 appendix-b-format=2 appendix-e-owner=2 cover=4 raster-text=3"
