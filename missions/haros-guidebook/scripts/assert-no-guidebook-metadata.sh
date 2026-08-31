#!/usr/bin/env bash

set -euo pipefail

guide_root="${1:?usage: assert-no-guidebook-metadata.sh <guide-root>}"
test -d "$guide_root"

metadata_path="$(find "$guide_root" -type f -name '.DS_Store' -print -quit)"
if [[ -n "$metadata_path" ]]; then
  echo "candidate scope contains nondeliverable OS metadata: $metadata_path" >&2
  exit 1
fi
