#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"

if [[ -n "${GUIDEBOOK_WEBSITE_DIR:-}" ]]; then
  website_root="$GUIDEBOOK_WEBSITE_DIR"
  mkdir -p "$website_root"
else
  website_root="$(mktemp -d /tmp/haros-guidebook-website.XXXXXX)"
fi
website_root="$(cd "$website_root" && pwd)"

cd "$guide_root"
reading_sources=()
while IFS= read -r source; do
  reading_sources+=("$source")
done < <(node publication/validate-run5.mjs --print-sources)
all_sources=(README.md "${reading_sources[@]}")
website_count="${#all_sources[@]}"

for source in "${all_sources[@]}"; do
  base="$(basename "$source" .md)"
  if [[ "$base" == "README" ]]; then
    base="index"
  fi
  pandoc "$source" \
    --from=markdown+yaml_metadata_block+pipe_tables \
    --standalone \
    --embed-resources \
    --resource-path="$guide_root:$(dirname "$guide_root/$source")" \
    --css=publication/guide.css \
    --lua-filter=publication/links.lua \
    --metadata=link-mode:website \
    --metadata=edition-scope:run5 \
    --metadata=title: \
    --metadata=pagetitle:"Haros Guidebook" \
    --output="$website_root/$base.html"
done

test "$website_count" = "60"
test -s "$website_root/index.html"
test -s "$website_root/00-preface.html"
test "$(find "$website_root" -maxdepth 1 -name '*.html' | wc -l | tr -d ' ')" = "$website_count"
! rg -n 'href="[^"]+\.md' "$website_root"

echo "render-guidebook-website=PASS pages=$website_count"
echo "website-root=$website_root"
