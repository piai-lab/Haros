#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
verify="false"
if [[ "${1:-}" == "--verify" ]]; then
  verify="true"
fi

if [[ -n "${GUIDEBOOK_RUN4_BUILD_DIR:-}" ]]; then
  build_root="$GUIDEBOOK_RUN4_BUILD_DIR"
  mkdir -p "$build_root"
else
  build_root="$(mktemp -d /tmp/haros-guidebook-run4.XXXXXX)"
fi
build_root="$(cd "$build_root" && pwd)"

website_root="$build_root/website"
mkdir -p "$website_root"

cd "$guide_root"
run4_sources=()
while IFS= read -r source; do
  run4_sources+=("$source")
done < <(
  node publication/validate-run2.mjs \
    --through=46 \
    --expected-generated=116 \
    --expected-captures=18 \
    --scope=run4 \
    --print-sources
)
all_sources=(README.md 00-preface.md "${run4_sources[@]}")
resource_paths=("$guide_root")
for source in "${run4_sources[@]}"; do
  resource_paths+=("$(dirname "$guide_root/$source")")
done
resource_path="$(IFS=:; echo "${resource_paths[*]}")"
website_count="${#all_sources[@]}"
expected_media="$(rg -o --no-filename '!\[[^]]*\]\([^)]+\.(?:jpg|png)\)' "${all_sources[@]}" | wc -l | tr -d ' ')"

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
    --metadata=edition-scope:run4 \
    --metadata=title:"Haros Guidebook Parts I-VI" \
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
  --metadata=edition-scope:run4 \
  --metadata=title:"Haros Guidebook Parts I-VI" \
  --output="$build_root/haros-guidebook-parts-01-06.html"

weasyprint \
  "$build_root/haros-guidebook-parts-01-06.html" \
  "$build_root/haros-guidebook-parts-01-06.pdf"

pandoc "${all_sources[@]}" \
  --from=markdown+yaml_metadata_block+pipe_tables \
  --toc \
  --resource-path="$resource_path" \
  --css=publication/guide.css \
  --lua-filter=publication/links.lua \
  --metadata=link-mode:standalone \
  --metadata=edition-scope:run4 \
  --metadata=title:"Haros Guidebook Parts I-VI" \
  --output="$build_root/haros-guidebook-parts-01-06.epub"

if [[ "$verify" == "true" ]]; then
  test -s "$website_root/index.html"
  test -s "$website_root/00-preface.html"
  test "$(find "$website_root" -maxdepth 1 -name '*.html' | wc -l | tr -d ' ')" = "$website_count"
  test -s "$build_root/haros-guidebook-parts-01-06.html"
  test -s "$build_root/haros-guidebook-parts-01-06.pdf"
  test -s "$build_root/haros-guidebook-parts-01-06.epub"
  ! rg -n 'href="[^"]+\.md' "$website_root" "$build_root/haros-guidebook-parts-01-06.html"
  for chapter in $(seq 1 46); do
    rg -q "Chapter $chapter" "$build_root/haros-guidebook-parts-01-06.html"
  done
  test "$(rg -o 'data:image/(?:jpeg|png);base64,' "$build_root/haros-guidebook-parts-01-06.html" | wc -l | tr -d ' ')" = "$expected_media"
  pdfinfo "$build_root/haros-guidebook-parts-01-06.pdf" | rg -q '^Pages:\s+[1-9][0-9]*$'
  unzip -tq "$build_root/haros-guidebook-parts-01-06.epub" >/dev/null
  test "$(unzip -Z1 "$build_root/haros-guidebook-parts-01-06.epub" | rg -c '\.(?:jpe?g|png)$')" = "$expected_media"
  python3 publication/validate-rendered-links.py \
    "$build_root" \
    --edition-name haros-guidebook-parts-01-06 \
    --website-count "$website_count" \
    --test-navigation-omission
fi

echo "render-run4=PASS"
echo "build-root=$build_root"
