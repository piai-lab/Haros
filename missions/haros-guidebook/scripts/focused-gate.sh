#!/usr/bin/env bash

set -euo pipefail

repo_root="/Users/liuzaoqu/Desktop/Develop/independent/Haros"
expected_sha="${1:?usage: focused-gate.sh <expected-candidate-sha256>}"
cd "$repo_root"

candidate_output="$repo_root/missions/evidence/haros-guidebook/output/sha256-$expected_sha"
test ! -e "$candidate_output"
output_root="$repo_root/missions/evidence/haros-guidebook/output"
candidate_stage="$(mktemp -d "$output_root/.staging-$expected_sha.XXXXXX")"
run6_repro_stage="$(mktemp -d /tmp/haros-guidebook-run6-focused-repro.XXXXXX)"
cleanup_stage() {
  if [[ -n "${candidate_stage:-}" && -d "$candidate_stage" ]]; then
    chmod -R u+w "$candidate_stage"
    rm -rf -- "$candidate_stage"
  fi
  if [[ -n "${run6_repro_stage:-}" && -d "$run6_repro_stage" ]]; then
    rm -rf -- "$run6_repro_stage"
  fi
}
trap cleanup_stage EXIT
actual_sha="$(bash missions/haros-guidebook/scripts/candidate-hash.sh | awk -F= '/^candidate_sha256=/{print $2}')"
test "$actual_sha" = "$expected_sha"

mkdir -p \
  "$candidate_stage/pilot" \
  "$candidate_stage/run2" \
  "$candidate_stage/run3" \
  "$candidate_stage/run4" \
  "$candidate_stage/run5"
bash missions/haros-guidebook/scripts/candidate-hash.sh >"$candidate_stage/candidate-manifest.txt"

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
GUIDEBOOK_BUILD_DIR="$candidate_stage/pilot" bash docs/guide/publication/render-pilot.sh --verify
bash docs/guide/publication/replay-captures.sh
node docs/guide/publication/validate-run2.mjs
GUIDEBOOK_RUN2_BUILD_DIR="$candidate_stage/run2" bash docs/guide/publication/render-run2.sh --verify
bash docs/guide/publication/replay-run2-captures.sh
node docs/guide/publication/validate-run2.mjs \
  --through=34 \
  --expected-generated=84 \
  --expected-captures=14 \
  --scope=run3
GUIDEBOOK_RUN3_BUILD_DIR="$candidate_stage/run3" \
  bash docs/guide/publication/render-run3.sh --verify
bash docs/guide/publication/replay-run3-captures.sh
node docs/guide/publication/validate-run4.mjs
bash docs/guide/publication/test-run4-validator-mutations.sh
GUIDEBOOK_RUN4_BUILD_DIR="$candidate_stage/run4" \
  bash docs/guide/publication/render-run4.sh --verify
bash docs/guide/publication/replay-run4-captures.sh
node docs/guide/publication/validate-run5.mjs
node docs/guide/publication/validate-run6.mjs
bash docs/guide/publication/test-run5-validator-mutations.sh
bash docs/guide/publication/test-run5-source-contracts.sh
GUIDEBOOK_RUN5_BUILD_DIR="$candidate_stage/run5" \
  bash docs/guide/publication/render-run5.sh --verify
GUIDEBOOK_RUN5_BUILD_DIR="$run6_repro_stage" \
  bash docs/guide/publication/render-run5.sh --verify
python3 docs/guide/publication/validate-run6-reproducibility.py \
  --left "$candidate_stage/run5" \
  --right "$run6_repro_stage"
bash docs/guide/publication/test-run6-validator-mutations.sh \
  "$candidate_stage/run5" \
  "$run6_repro_stage"
rm -rf -- "$run6_repro_stage"
run6_repro_stage=""
python3 docs/guide/publication/validate-rendered-figures.py \
  --build "$candidate_stage/pilot" haros-guidebook-pilot \
  --build "$candidate_stage/run2" haros-guidebook-parts-01-02 \
  --build "$candidate_stage/run3" haros-guidebook-parts-01-04 \
  --build "$candidate_stage/run4" haros-guidebook-parts-01-06 \
  --build "$candidate_stage/run5" haros-guidebook
python3 docs/guide/publication/validate-publication-quality.py \
  --build "$candidate_stage/pilot" haros-guidebook-pilot includes-ch37 \
  --build "$candidate_stage/run2" haros-guidebook-parts-01-02 run2 \
  --build "$candidate_stage/run3" haros-guidebook-parts-01-04 through-34 \
  --build "$candidate_stage/run4" haros-guidebook-parts-01-06 through-46 \
  --build "$candidate_stage/run5" haros-guidebook through-50
python3 missions/haros-guidebook/scripts/check-goal-scoped.py

post_sha="$(bash missions/haros-guidebook/scripts/candidate-hash.sh | awk -F= '/^candidate_sha256=/{print $2}')"
test "$post_sha" = "$expected_sha"
(
  cd "$candidate_stage"
  find . -type f -not -name artifact-sha256.txt -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 shasum -a 256 >artifact-sha256.txt
)
chmod -R a-w "$candidate_stage"
mv "$candidate_stage" "$candidate_output"
candidate_stage=""
trap - EXIT

echo "focused-gate=PASS"
echo "candidate_sha256=$expected_sha"
echo "candidate_output=$candidate_output"
