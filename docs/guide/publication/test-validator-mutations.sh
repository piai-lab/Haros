#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
temp_root="$(mktemp -d /tmp/haros-guidebook-mutations.XXXXXX)"
trap 'rm -rf -- "$temp_root"' EXIT
cp -R "$guide_root" "$temp_root/guide"

GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/sync-navigation.mjs" --write >/dev/null
python3 - "$temp_root/guide/part-01-meet-haros/03-agent-chat-studio.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
old = "[Next: Your First Complete Task](04-your-first-complete-task.md)"
new = "[Next: Queue, Steer, Interrupt](../part-02-workbench/14-queue-steer-interrupt.md)"
if old not in source:
    raise SystemExit("Chapter 3 generated next link not found")
path.write_text(source.replace(old, new, 1))
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/sync-navigation.mjs" --check >/dev/null 2>&1; then
  echo "navigation mutation unexpectedly passed" >&2
  exit 1
fi

rm -rf -- "$temp_root/guide"
cp -R "$guide_root" "$temp_root/guide"
GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/sync-navigation.mjs" --write >/dev/null
python3 - "$temp_root/guide/part-04-capabilities/25-files-search-preview-editors.md" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
old = "[Previous: Handoffs, Branches, and Worktrees](../part-03-organize-work/24-handoffs-branches-worktrees.md)"
new = "[Previous: Images and Voice](../part-03-organize-work/21-images-and-voice.md)"
if old not in source:
    raise SystemExit("Chapter 25 generated previous link not found")
path.write_text(source.replace(old, new, 1))
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/sync-navigation.mjs" --check >/dev/null 2>&1; then
  echo "Run 3 navigation mutation unexpectedly passed" >&2
  exit 1
fi

rm -rf -- "$temp_root/guide"
cp -R "$guide_root" "$temp_root/guide"
GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" --write >/dev/null
GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" >/dev/null
python3 - "$temp_root/guide/part-02-workbench/09-threads-turns-messages-and-sessions.md" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
source = path.read_text()
pattern = re.compile(
    r"(!\[[^\]]*\]\([^)]*assets/generated/ch-09-primary\.jpg\)[\s\S]*?"
    r"\*\*Accessible equivalent\.\*\*\s+)([\s\S]*?)(?=\n\s*\n)"
)
match = pattern.search(source)
if not match:
    raise SystemExit("Chapter 9 primary accessible equivalent not found")
wrong = re.sub(r"\bProduct Thread\b", "Native Engine Session", match.group(2), count=1)
if wrong == match.group(2):
    raise SystemExit("Chapter 9 mutation anchor not found")
path.write_text(source[: match.start(2)] + wrong + source[match.end(2) :])
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" >/dev/null 2>&1; then
  echo "Chapter 9 semantic mutation unexpectedly passed" >&2
  exit 1
fi

rm -rf -- "$temp_root/guide"
cp -R "$guide_root" "$temp_root/guide"
GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" --write >/dev/null
GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" >/dev/null
python3 - "$temp_root/guide/part-03-organize-work/20-attachments-mentions-skills-references.md" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
source = path.read_text()
pattern = re.compile(
    r"(!\[[^\]]*\]\([^)]*assets/generated/ch-20-primary\.jpg\)[\s\S]*?"
    r"\*\*Accessible equivalent\.\*\*\s+)([\s\S]*?)(?=\n\s*\n)"
)
match = pattern.search(source)
if not match:
    raise SystemExit("Chapter 20 primary accessible equivalent not found")
wrong = "Prompt, Attachments, Mentions, and Skills enter one admitted Turn. Nothing else accompanies it."
path.write_text(source[: match.start(2)] + wrong + source[match.end(2) :])
PY
if GUIDEBOOK_ROOT_OVERRIDE="$temp_root/guide" node "$script_dir/figure-contracts.mjs" >/dev/null 2>&1; then
  echo "Chapter 20 semantic mutation unexpectedly passed" >&2
  exit 1
fi

python3 "$script_dir/test-palette-validator-mutation.py"

echo "validator-mutations=PASS cases=5 parts=I-IV palette_cases=1"
