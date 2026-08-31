#!/usr/bin/env bash

set -euo pipefail

repo_root="/Users/liuzaoqu/Desktop/Develop/independent/Haros"
cd "$repo_root"
expected_sha="${1:-$(bash missions/haros-guidebook/scripts/candidate-hash.sh | awk -F= '/^candidate_sha256=/{print $2}')}"
gate_build_root="$(mktemp -d /tmp/haros-guidebook-final-gate.XXXXXX)"
trap 'rm -rf -- "$gate_build_root"' EXIT

pre_sha="$(bash missions/haros-guidebook/scripts/candidate-hash.sh | awk -F= '/^candidate_sha256=/{print $2}')"
test "$pre_sha" = "$expected_sha"

test -f docs/guide/publication/validate-pilot.mjs
test -f docs/guide/publication/render-pilot.sh
test -f docs/guide/publication/validate-run2.mjs
test -f docs/guide/publication/render-run2.sh
test -f docs/guide/publication/render-run3.sh
test -f docs/guide/publication/validate-run4.mjs
test -f docs/guide/publication/render-run4.sh
test -f docs/guide/publication/validate-run5.mjs
test -f docs/guide/publication/render-run5.sh

bash missions/haros-guidebook/scripts/bootstrap.sh
bash missions/haros-guidebook/scripts/test-candidate-freeze-mutations.sh
bash missions/haros-guidebook/scripts/test-candidate-mutation-isolation.sh
bunx oxfmt --check \
  docs/haros-guidebook-plan.md \
  docs/guide \
  missions/haros-guidebook.md \
  missions/haros-guidebook-goal.md

python3 docs/guide/publication/trim-generated-rasters.py --check
python3 docs/guide/publication/validate-generated-palette.py
node docs/guide/publication/sync-visual-truth.mjs --check
bash docs/guide/publication/test-validator-mutations.sh
node docs/guide/publication/validate-pilot.mjs
GUIDEBOOK_BUILD_DIR="$gate_build_root/pilot" bash docs/guide/publication/render-pilot.sh --verify
bash docs/guide/publication/replay-captures.sh
node docs/guide/publication/validate-run2.mjs
GUIDEBOOK_RUN2_BUILD_DIR="$gate_build_root/run2" bash docs/guide/publication/render-run2.sh --verify
bash docs/guide/publication/replay-run2-captures.sh
node docs/guide/publication/validate-run2.mjs \
  --through=34 \
  --expected-generated=84 \
  --expected-captures=14 \
  --scope=run3
GUIDEBOOK_RUN3_BUILD_DIR="$gate_build_root/run3" \
  bash docs/guide/publication/render-run3.sh --verify
bash docs/guide/publication/replay-run3-captures.sh
node docs/guide/publication/validate-run4.mjs
bash docs/guide/publication/test-run4-validator-mutations.sh
GUIDEBOOK_RUN4_BUILD_DIR="$gate_build_root/run4" \
  bash docs/guide/publication/render-run4.sh --verify
bash docs/guide/publication/replay-run4-captures.sh
node docs/guide/publication/validate-run5.mjs
node docs/guide/publication/validate-run6.mjs
bash docs/guide/publication/test-run5-validator-mutations.sh
bash docs/guide/publication/test-run5-source-contracts.sh
GUIDEBOOK_RUN5_BUILD_DIR="$gate_build_root/run5" \
  bash docs/guide/publication/render-run5.sh --verify
GUIDEBOOK_RUN5_BUILD_DIR="$gate_build_root/run5-repro" \
  bash docs/guide/publication/render-run5.sh --verify
python3 docs/guide/publication/validate-run6-reproducibility.py \
  --left "$gate_build_root/run5" \
  --right "$gate_build_root/run5-repro"
bash docs/guide/publication/test-run6-validator-mutations.sh \
  "$gate_build_root/run5" \
  "$gate_build_root/run5-repro"
python3 docs/guide/publication/validate-rendered-figures.py \
  --build "$gate_build_root/pilot" haros-guidebook-pilot \
  --build "$gate_build_root/run2" haros-guidebook-parts-01-02 \
  --build "$gate_build_root/run3" haros-guidebook-parts-01-04 \
  --build "$gate_build_root/run4" haros-guidebook-parts-01-06 \
  --build "$gate_build_root/run5" haros-guidebook
python3 docs/guide/publication/validate-publication-quality.py \
  --build "$gate_build_root/pilot" haros-guidebook-pilot includes-ch37 \
  --build "$gate_build_root/run2" haros-guidebook-parts-01-02 run2 \
  --build "$gate_build_root/run3" haros-guidebook-parts-01-04 through-34 \
  --build "$gate_build_root/run4" haros-guidebook-parts-01-06 through-46 \
  --build "$gate_build_root/run5" haros-guidebook through-50
python3 missions/haros-guidebook/scripts/check-goal-scoped.py

post_sha="$(bash missions/haros-guidebook/scripts/candidate-hash.sh | awk -F= '/^candidate_sha256=/{print $2}')"
test "$post_sha" = "$expected_sha"

echo "final-gate=PASS"
echo "candidate_sha256=$expected_sha"
