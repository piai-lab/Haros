#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guide_root="$(cd "$script_dir/.." && pwd)"
verify="false"
if [[ "${1:-}" == "--verify" ]]; then
  verify="true"
fi

if [[ -n "${GUIDEBOOK_RUN5_BUILD_DIR:-}" ]]; then
  build_root="$GUIDEBOOK_RUN5_BUILD_DIR"
  mkdir -p "$build_root"
else
  build_root="$(mktemp -d /tmp/haros-guidebook-run5.XXXXXX)"
fi
build_root="$(cd "$build_root" && pwd)"
website_root="$build_root/website"
mkdir -p "$website_root"

cd "$guide_root"
reading_sources=()
while IFS= read -r source; do
  reading_sources+=("$source")
done < <(node publication/validate-run5.mjs --print-sources)
all_sources=(README.md "${reading_sources[@]}")
resource_paths=("$guide_root")
for source in "${reading_sources[@]}"; do
  resource_paths+=("$(dirname "$guide_root/$source")")
done
resource_path="$(IFS=:; echo "${resource_paths[*]}")"
website_count="${#all_sources[@]}"
expected_media="$(rg -o --no-filename '!\[[^]]*\]\([^)]+\.(?:jpg|png)\)' "${all_sources[@]}" | wc -l | tr -d ' ')"
source_tables="$(rg -o --no-filename '^\|.*-{3}' "${all_sources[@]}" | wc -l | tr -d ' ')"
edition_source_date_epoch="1788134400"
edition_date="2026-08-31"
edition_identifier="urn:uuid:29b2b39c-49eb-5a20-aa38-f95d76acd228"

GUIDEBOOK_WEBSITE_DIR="$website_root" "$script_dir/render-website.sh"

pandoc "${all_sources[@]}" \
  --from=markdown+yaml_metadata_block+pipe_tables \
  --standalone \
  --toc \
  --embed-resources \
  --resource-path="$resource_path" \
  --css=publication/guide.css \
  --lua-filter=publication/links.lua \
  --metadata=link-mode:standalone \
  --metadata=edition-scope:run5 \
  --metadata=title: \
  --metadata=pagetitle:"Haros Guidebook" \
  --output="$build_root/haros-guidebook.html"

pdf_source="$build_root/.haros-guidebook-pdf-source.html"
python3 publication/prepare-pdf.py \
  "$build_root/haros-guidebook.html" \
  "$pdf_source"
weasyprint "$pdf_source" "$build_root/haros-guidebook.pdf"
rm "$pdf_source"

env SOURCE_DATE_EPOCH="$edition_source_date_epoch" pandoc "${all_sources[@]}" \
  --from=markdown+yaml_metadata_block+pipe_tables \
  --toc \
  --resource-path="$resource_path" \
  --css=publication/guide.css \
  --lua-filter=publication/links.lua \
  --metadata=link-mode:standalone \
  --metadata=edition-scope:run5 \
  --metadata=title:"Haros Guidebook" \
  --metadata=identifier:"$edition_identifier" \
  --metadata=date:"$edition_date" \
  --output="$build_root/haros-guidebook.epub"

cover_reproduction_root="$build_root/cover-reproduction"
mkdir -p \
  "$cover_reproduction_root/assets/brand" \
  "$cover_reproduction_root/guide/assets/generated/sources" \
  "$cover_reproduction_root/guide/publication"
cp "$guide_root/../../assets/brand/harnessos-mark.svg" \
  "$cover_reproduction_root/assets/brand/harnessos-mark.svg"
cp "$guide_root/assets/generated/cover-01.jpg" \
  "$guide_root/assets/generated/cover-01.md" \
  "$cover_reproduction_root/guide/assets/generated/"
cp "$guide_root/assets/generated/sources/cover-01-field.png" \
  "$guide_root/assets/generated/sources/cover-01-mark-layer.png" \
  "$guide_root/assets/generated/sources/cover-01-wordmark-layer.png" \
  "$guide_root/assets/generated/sources/cover-01-composition.json" \
  "$cover_reproduction_root/guide/assets/generated/sources/"
cp "$guide_root/publication/compose-cover.mjs" \
  "$guide_root/publication/validate-cover-composition.mjs" \
  "$cover_reproduction_root/guide/publication/"
node "$cover_reproduction_root/guide/publication/compose-cover.mjs" \
  --guide-root "$cover_reproduction_root/guide" \
  --repository-root "$cover_reproduction_root" \
  --output "$cover_reproduction_root/recomposed-cover-01.jpg"
cmp "$cover_reproduction_root/recomposed-cover-01.jpg" \
  "$cover_reproduction_root/guide/assets/generated/cover-01.jpg"

if [[ "$verify" == "true" ]]; then
  test "$website_count" = "60"
  test "$expected_media" = "158"
  test "$source_tables" = "200"
  test -s "$website_root/index.html"
  test -s "$website_root/00-preface.html"
  test "$(find "$website_root" -maxdepth 1 -name '*.html' | wc -l | tr -d ' ')" = "$website_count"
  test -s "$build_root/haros-guidebook.html"
  test -s "$build_root/haros-guidebook.pdf"
  test -s "$build_root/haros-guidebook.epub"
  ! rg -n 'href="[^"]+\.md' "$website_root" "$build_root/haros-guidebook.html"
  for chapter in $(seq 1 50); do
    rg -q "Chapter $chapter" "$build_root/haros-guidebook.html"
  done
  for appendix in A B C D E F G H; do
    rg -q "Appendix $appendix" "$build_root/haros-guidebook.html"
  done
  test "$(rg -o --no-filename 'data:image/(?:jpeg|png);base64,' "$build_root/haros-guidebook.html" | wc -l | tr -d ' ')" = "$expected_media"
  website_tables="$(rg -o --no-filename '<table\b' "$website_root" | wc -l | tr -d ' ')"
  standalone_tables="$(rg -o --no-filename '<table\b' "$build_root/haros-guidebook.html" | wc -l | tr -d ' ')"
  test "$website_tables" = "$source_tables"
  test "$standalone_tables" = "$source_tables"
  pdfinfo "$build_root/haros-guidebook.pdf" | rg -q '^Pages:\s+[1-9][0-9]*$'
  unzip -tq "$build_root/haros-guidebook.epub" >/dev/null
  test "$(unzip -Z1 "$build_root/haros-guidebook.epub" | rg -c '\.(?:jpe?g|png)$')" = "$expected_media"
  python3 publication/validate-rendered-links.py \
    "$build_root" \
    --edition-name haros-guidebook \
    --website-count "$website_count" \
    --test-navigation-omission
  python3 publication/validate-rendered-figures.py \
    --build "$build_root" haros-guidebook
  python3 publication/validate-publication-quality.py \
    --build "$build_root" haros-guidebook through-50
  python3 publication/validate-run6-rendered.py \
    --build "$build_root"
  echo "render-run5-derived-tables=PASS source_markdown=$source_tables website=$website_tables standalone=$standalone_tables epub=$standalone_tables"
fi

echo "render-run5=PASS"
echo "build-root=$build_root"
