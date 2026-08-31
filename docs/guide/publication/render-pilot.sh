#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$guide_root/../.." && pwd)"
verify="false"
if [[ "${1:-}" == "--verify" ]]; then
  verify="true"
fi

if [[ -n "${GUIDEBOOK_BUILD_DIR:-}" ]]; then
  build_root="$GUIDEBOOK_BUILD_DIR"
  mkdir -p "$build_root"
else
  build_root="$(mktemp -d /tmp/haros-guidebook-pilot.XXXXXX)"
fi
build_root="$(cd "$build_root" && pwd)"

website_root="$build_root/website"
mkdir -p "$website_root"

cd "$guide_root"
pilot_sources=()
while IFS= read -r source; do
  pilot_sources+=("$source")
done < <(
  node publication/validate-run2.mjs --print-sources
  printf '%s\n' 'part-05-architecture/37-product-orchestration.md'
)
all_sources=(README.md 00-preface.md "${pilot_sources[@]}")
resource_paths=("$guide_root")
for source in "${pilot_sources[@]}"; do
  resource_paths+=("$(dirname "$guide_root/$source")")
done
resource_path="$(IFS=:; echo "${resource_paths[*]}")"

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
    --metadata=edition-scope:pilot \
    --metadata=title:"Haros Guidebook Pilot" \
    --output="$website_root/$base.html"
done

pandoc "${all_sources[@]}" \
  --from=markdown+yaml_metadata_block+pipe_tables \
  --standalone \
  --toc \
  --embed-resources \
  --resource-path="$resource_path" \
  --css=publication/guide.css \
  --lua-filter=publication/links.lua \
  --metadata=link-mode:standalone \
  --metadata=edition-scope:pilot \
  --metadata=title:"Haros Guidebook Pilot" \
  --output="$build_root/haros-guidebook-pilot.html"

weasyprint "$build_root/haros-guidebook-pilot.html" "$build_root/haros-guidebook-pilot.pdf"

pandoc "${all_sources[@]}" \
  --from=markdown+yaml_metadata_block+pipe_tables \
  --toc \
  --resource-path="$resource_path" \
  --css=publication/guide.css \
  --lua-filter=publication/links.lua \
  --metadata=link-mode:standalone \
  --metadata=edition-scope:pilot \
  --metadata=title:"Haros Guidebook Pilot" \
  --output="$build_root/haros-guidebook-pilot.epub"

if [[ "$verify" == "true" ]]; then
  test -s "$website_root/index.html"
  test -s "$website_root/00-preface.html"
  test "$(find "$website_root" -maxdepth 1 -name '*.html' | wc -l | tr -d ' ')" = "18"
  test -s "$build_root/haros-guidebook-pilot.html"
  test -s "$build_root/haros-guidebook-pilot.pdf"
  test -s "$build_root/haros-guidebook-pilot.epub"
  ! rg -n 'href="[^"]+\.md' "$website_root" "$build_root/haros-guidebook-pilot.html"
  rg -q "Chapter 3" "$build_root/haros-guidebook-pilot.html"
  rg -q "Chapter 14" "$build_root/haros-guidebook-pilot.html"
  rg -q "Chapter 37" "$build_root/haros-guidebook-pilot.html"
  test "$(rg -o 'data:image/(?:jpeg|png);base64,' "$build_root/haros-guidebook-pilot.html" | wc -l | tr -d ' ')" = "46"
  pdfinfo "$build_root/haros-guidebook-pilot.pdf" | rg -q '^Pages:\s+[1-9][0-9]*$'
  unzip -tq "$build_root/haros-guidebook-pilot.epub" >/dev/null
  test "$(unzip -Z1 "$build_root/haros-guidebook-pilot.epub" | rg -c '\.(?:jpe?g|png)$')" = "46"
  python3 publication/validate-rendered-links.py \
    "$build_root" \
    --website-count 18 \
    --test-navigation-omission
fi

echo "render-pilot=PASS"
echo "build-root=$build_root"
