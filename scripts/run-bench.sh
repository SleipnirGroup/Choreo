#!/usr/bin/env bash
# Run choreo-cli generation for one (or every) project variant.
#
# Usage: run-bench.sh <cli-binary> <test-projects-dir> <output-dir> [variant] [runs]
#
# If [variant] is given, only that one project subdirectory is benched (used by
# the CI per-variant matrix so each job runs a single variant concurrently).
# Omit it to bench every variant (local / single-job use). [runs] defaults to 3.
set -euo pipefail

CLI=${1:?missing CLI binary path}
PROJECTS=${2:?missing test-projects dir}
OUT=${3:?missing output dir}
ONLY_VARIANT=${4:-}
RUNS=${5:-3}

mkdir -p "$OUT"

shopt -s nullglob
if [ -n "$ONLY_VARIANT" ]; then
  project_dirs=("$PROJECTS/$ONLY_VARIANT/")
  if [ ! -d "${project_dirs[0]}" ]; then
    echo "variant '$ONLY_VARIANT' not found under $PROJECTS" >&2
    exit 1
  fi
else
  project_dirs=("$PROJECTS"/*/)
fi
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
  for run in $(seq 1 "$RUNS"); do
    echo "--- $name run $run/$RUNS ---"
    # A per-trajectory solve failure is reported via ok:false in the JSON and
    # the CLI still exits 0; a nonzero exit means a hard failure (bad project,
    # crash, or the 20m cap below) — record it and keep going so other
    # runs/variants still produce data instead of aborting the whole matrix job.
    # Cap each run at 20m so one runaway/hung solve can't burn the whole job's
    # wall clock; -k 1m escalates to SIGKILL if the CLI ignores SIGTERM.
    timeout -k 1m 20m "$CLI" --chor "$chor" --all-trajectory --generate \
      --report-json "$OUT/$name.run$run.report.json" \
      || echo "choreo-cli failed or timed out (>20m) on $name run $run/$RUNS" >&2
  done
  echo "::endgroup::"
done
