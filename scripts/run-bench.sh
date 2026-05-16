#!/usr/bin/env bash
# Run choreo-cli generation for one (or every) project variant.
#
# Usage: run-bench.sh <cli-binary> <test-projects-dir> <output-dir> [variant] [runs]
#
# If [variant] is given, only that one project subdirectory is benched (used by
# the CI per-variant matrix so each job runs a single variant concurrently).
# Omit it to bench every variant (local / single-job use). [runs] defaults to 5.
#
# Each trajectory is solved by its OWN `choreo-cli --trajectory` process and all
# of a variant's trajectories for a given run are launched concurrently. The
# single-element reports are then merged back into the `<variant>.run<N>.report.json`
# array bench-report.mjs expects.
#
# Set BENCH_TRAJ_JOBS=N to cap concurrency (0 / unset = no cap, i.e. all of
# the variant's trajectories at once).
#
# Solve metric: the `solve_ms` the report scores on is the whole choreo-cli
# process's CPU time (user+sys), measured externally with the bash `time`
# keyword and substituted for the CLI's own in-process wall figure during the
# merge. CPU time is immune to noisy-neighbor CPU steal and to the contention
# we deliberately create by running solves in parallel — both of which inflate
# wall time. Because each process solves exactly ONE trajectory, the solver's
# CPU dominates the fixed CLI startup/IO, and that small overhead is identical
# on PR and base so it cancels in the delta.

set -euo pipefail

# C locale: deterministic `%U`/`%S` decimal point for the timing parse below.
export LC_ALL=C
# `time` emits only "<user_s> <sys_s>" (no real, no labels) to its stderr.
TIMEFORMAT='%U %S'

CLI=${1:?missing CLI binary path}
PROJECTS=${2:?missing test-projects dir}
OUT=${3:?missing output dir}
ONLY_VARIANT=${4:-}
RUNS=${5:-5}
TRAJ_JOBS=${BENCH_TRAJ_JOBS:-4}   # GHA runners are 4-core
mkdir -p "$OUT"

# Per-trajectory shards live outside $OUT so they neither bloat the uploaded
# artifact nor get picked up as extra "runs" by bench-report.mjs's loadRuns.
SHARD_ROOT=$(mktemp -d)
trap 'rm -rf "$SHARD_ROOT"' EXIT

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

# Merge the single-element shard reports in $1 into the combined run report $2
# (the array shape bench-report.mjs's loadRuns/aggregateSide consume), while
# replacing each trajectory's solve_ms with the externally measured process CPU
# time from its sibling `<traj>.cpu` file (user+sys seconds → ms). Each shard
# is exactly one trajectory's invocation, so its whole-process CPU maps 1:1 to
# that one entry. If a `.cpu` is missing/garbled the CLI's own wall solve_ms is
# kept as a fallback (logged). An empty shard set yields `[]`, which the report
# treats as "this run produced nothing".
merge_shards() {
  local shard_dir=$1 out_file=$2
  node -e '
    const fs = require("fs");
    const path = require("path");
    const [out, dir] = process.argv.slice(1);
    const merged = [];
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith(".report.json")) continue;
      const base = f.slice(0, -".report.json".length);
      let arr;
      try {
        arr = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch (e) {
        console.error(`merge: skipping ${f}: ${e.message}`);
        continue;
      }
      if (!Array.isArray(arr)) continue;
      let cpuMs = null;
      try {
        const t = fs.readFileSync(path.join(dir, base + ".cpu"), "utf8")
          .trim().split(/\s+/).map(Number);
        if (t.length >= 2 && t.every(Number.isFinite)) cpuMs = (t[0] + t[1]) * 1000;
      } catch { /* fall through to wall fallback */ }
      if (cpuMs == null) console.error(`merge: no CPU time for ${base}, keeping CLI wall solve_ms`);
      for (const e of arr) {
        if (cpuMs != null) e.solve_ms = cpuMs;
        merged.push(e);
      }
    }
    fs.writeFileSync(out, JSON.stringify(merged, null, 2));
  ' "$out_file" "$shard_dir"
}

for proj_dir in "${project_dirs[@]}"; do
  name=$(basename "$proj_dir")
  chor="$proj_dir/project.chor"
  if [ ! -f "$chor" ]; then
    echo "skipping $name (no project.chor)" >&2
    continue
  fi
  # Trajectory names are the .traj basenames in the project dir — the same set
  # `--all-trajectory` would have enumerated via find_all_trajectories.
  traj_files=("$proj_dir"/*.traj)
  if [ "${#traj_files[@]}" -eq 0 ]; then
    echo "skipping $name (no .traj files)" >&2
    continue
  fi
  traj_names=()
  for tf in "${traj_files[@]}"; do
    traj_names+=("$(basename "$tf" .traj)")
  done

  echo "::group::$name"
  for run in $(seq 1 "$RUNS"); do
    echo "--- $name run $run/$RUNS (${#traj_names[@]} trajectories in parallel) ---"
    run_shards="$SHARD_ROOT/$name.run$run"
    mkdir -p "$run_shards"
    # One process per trajectory, launched concurrently. A per-trajectory solve
    # failure is recorded as ok:false in that shard (the CLI still exits 0); a
    # nonzero exit (crash/kill) just leaves no shard for that trajectory this
    # run, which bench-report.mjs already treats as a missing sample for it.
    for tn in "${traj_names[@]}"; do
      if [ "$TRAJ_JOBS" -gt 0 ]; then
        while [ "$(jobs -rp | wc -l)" -ge "$TRAJ_JOBS" ]; do wait -n || true; done
      fi
      {
        # fd3 = this shell's stderr (CLI logs flow there as before); the brace
        # group's own stderr — where the `time` keyword writes "%U %S" — goes
        # to <traj>.cpu, so the timing is isolated from choreo-cli's ~MBs of
        # solver/tracing output instead of buried in it.
        { time "$CLI" --chor "$chor" --trajectory "$tn" --generate \
            --report-json "$run_shards/$tn.report.json" 2>&3 ; } \
          3>&2 2>"$run_shards/$tn.cpu" \
          || echo "choreo-cli exited nonzero on $name/$tn run $run/$RUNS" >&2
      } &
    done
    wait
    merge_shards "$run_shards" "$OUT/$name.run$run.report.json"
  done
  echo "::endgroup::"
done
