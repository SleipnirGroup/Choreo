#!/usr/bin/env bash
# Run choreo-cli generation across every project variant in $2, using hyperfine
# for repeated-run statistics. The CLI's own --report-json carries the
# authoritative per-trajectory solve_ms (it brackets only generate(), not
# process startup).
#
# Usage: run-bench.sh <cli-binary> <test-projects-dir> <output-dir>
set -euo pipefail

CLI=${1:?missing CLI binary path}
PROJECTS=${2:?missing test-projects dir}
OUT=${3:?missing output dir}

mkdir -p "$OUT"

shopt -s nullglob
project_dirs=("$PROJECTS"/*/)
if [ "${#project_dirs[@]}" -eq 0 ]; then
  echo "no project subdirectories found under $PROJECTS" >&2
  exit 1
fi

for proj_dir in "${project_dirs[@]}"; do
  name=$(basename "$proj_dir")
  chor="$proj_dir/project.chor"
  if [ ! -f "$chor" ]; then
    echo "skipping $name (no project.chor)" >&2
    continue
  fi
  echo "::group::$name"
  hyperfine \
    --runs 3 \
    --export-json "$OUT/$name.hyperfine.json" \
    "$CLI --chor $chor --all-trajectory --generate --report-json $OUT/$name.report.json"
  echo "::endgroup::"
done
