#!/usr/bin/env bash
# Local equivalent of .github/workflows/benchmark.yml — runs the bench pipeline
# against your working tree, optionally comparing to a base git ref, and writes
# everything (SVGs + reports + markdown) into ./bench-local/.
#
# Usage:
#   scripts/bench-local.sh              # PR-only run, no comparison
#   scripts/bench-local.sh <base-ref>   # full comparison vs <base-ref> (e.g. main)
#
# Requires: cargo and node (node also performs run-bench.sh's per-trajectory
# JSON merge). The base build uses `git worktree` so your current checkout
# stays untouched.
#
# Concurrency (locally we want to saturate the box, unlike CI's 1-variant-per-
# job matrix): variants are benched in parallel, and within each variant
# run-bench.sh runs that variant's trajectories in parallel too. Peak solver
# processes ≈ BENCH_VARIANT_JOBS × BENCH_TRAJ_JOBS, so size the product to your
# core count:
#   BENCH_VARIANT_JOBS  max variants in parallel   (default: nproc/4, min 1)
#   BENCH_TRAJ_JOBS     trajectories per variant   (run-bench.sh, default 4)
# Defaults give ≈ nproc concurrent solves. Example:
#   BENCH_VARIANT_JOBS=8 BENCH_TRAJ_JOBS=4 scripts/bench-local.sh

set -euo pipefail

REPO_ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
cd "$REPO_ROOT"

BASE_REF=${1:-}
NPROC=$(nproc 2>/dev/null || echo 4)
VARIANT_JOBS=${BENCH_VARIANT_JOBS:-$(( NPROC / 4 > 0 ? NPROC / 4 : 1 ))}
OUT_ROOT="$REPO_ROOT/bench-local"
PR_TP="$OUT_ROOT/tp-pr"
BASE_TP="$OUT_ROOT/tp-base"
PR_OUT="$OUT_ROOT/out-pr"
BASE_OUT="$OUT_ROOT/out-base"
BASE_WORKTREE="$OUT_ROOT/base-worktree"

if [ ! -d "$REPO_ROOT/test-projects" ]; then
  echo "test-projects/ not found at repo root" >&2
  exit 1
fi
for cmd in cargo node; do
  command -v "$cmd" >/dev/null || { echo "missing required command: $cmd" >&2; exit 1; }
done

# Bench every variant under $2 with $1, writing reports to $3, running up to
# $VARIANT_JOBS variants concurrently. Each variant is a separate run-bench.sh
# process (its own SHARD_ROOT, its own variant-prefixed report files — no
# cross-variant collision in the shared out dir). Per-variant output is teed to
# bench-local/logs/<label>-<variant>.log so the parallel console stays legible;
# a variant failing is reported but does not abort the rest.
bench_all() {
  local cli=$1 tp=$2 out=$3 label=$4
  shopt -s nullglob
  local dirs=("$tp"/*/) d variant
  if [ "${#dirs[@]}" -eq 0 ]; then
    echo "no variants under $tp" >&2
    return 1
  fi
  mkdir -p "$OUT_ROOT/logs"
  echo "==> Running $label benchmark — ${#dirs[@]} variants, up to $VARIANT_JOBS in parallel (${BENCH_TRAJ_JOBS:-4} trajectories each)"
  for d in "${dirs[@]}"; do
    variant=$(basename "$d")
    [ -f "$d/project.chor" ] || { echo "  skip $variant (no project.chor)" >&2; continue; }
    while [ "$(jobs -rp | wc -l)" -ge "$VARIANT_JOBS" ]; do wait -n || true; done
    {
      lf="$OUT_ROOT/logs/$label-$variant.log"
      if bash "$REPO_ROOT/scripts/run-bench.sh" "$cli" "$tp" "$out" "$variant" >"$lf" 2>&1; then
        echo "  done  $label/$variant"
      else
        echo "  FAIL  $label/$variant (see $lf)" >&2
      fi
    } &
  done
  wait
}

rm -rf "$OUT_ROOT"
mkdir -p "$PR_OUT" "$BASE_OUT"

echo "==> Building PR choreo-cli (current tree)"
cargo build --release -p choreo-cli
PR_CLI="$REPO_ROOT/target/release/choreo-cli"
cp "$PR_CLI" "$OUT_ROOT/cli-pr"

echo "==> Snapshotting test-projects/"
cp -r "$REPO_ROOT/test-projects" "$PR_TP"
if [ -n "$BASE_REF" ]; then
  cp -r "$REPO_ROOT/test-projects" "$BASE_TP"
else
  # No base ref — give the report builder an empty dir so the "base" columns
  # collapse to "—" instead of silently comparing PR regen to whatever stale
  # samples happen to be committed to test-projects/.
  mkdir -p "$BASE_TP"
fi

bench_all "$OUT_ROOT/cli-pr" "$PR_TP" "$PR_OUT" PR

ARTIFACT_ARG=()
if [ -n "$BASE_REF" ]; then
  if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
    echo "base ref '$BASE_REF' is not a valid git ref" >&2
    exit 1
  fi
  echo "==> Setting up worktree for base ref '$BASE_REF'"
  git worktree add --detach "$BASE_WORKTREE" "$BASE_REF"
  trap 'git worktree remove --force "$BASE_WORKTREE" 2>/dev/null || true' EXIT

  # Build base CLI inside the base worktree using a separate target dir so we
  # don't blow away the working-tree's incremental cache.
  echo "==> Building base choreo-cli (in worktree, separate target dir)"
  (
    cd "$BASE_WORKTREE"
    CARGO_TARGET_DIR="$OUT_ROOT/base-target" cargo build --release -p choreo-cli
  )
  cp "$OUT_ROOT/base-target/release/choreo-cli" "$OUT_ROOT/cli-base"

  bench_all "$OUT_ROOT/cli-base" "$BASE_TP" "$BASE_OUT" base || true
fi

echo "==> Rendering SVGs"
render_side() {
  local side=$1
  local root=$2
  for traj in "$root"/*/*.traj; do
    [ -f "$traj" ] || continue
    variant=$(basename "$(dirname "$traj")")
    name=$(basename "$traj" .traj)
    # Best-effort per trajectory, matching scripts/ci/render-variant.sh: one
    # bad render must not abort the whole local run under `set -e`.
    node "$REPO_ROOT/scripts/render-traj.mjs" \
      --traj "$traj" \
      --out "${traj%.traj}.${side}.svg" \
      --title "${side^^}  ${variant} · ${name}" || true
  done
}
render_side pr "$PR_TP"
if [ -n "$BASE_REF" ]; then
  render_side base "$BASE_TP"
fi

echo "==> Collecting SVGs into bench-local/svgs/"
mkdir -p "$OUT_ROOT/svgs"
find "$PR_TP" "$BASE_TP" -name "*.svg" -print0 2>/dev/null | while IFS= read -r -d '' f; do
  variant=$(basename "$(dirname "$f")")
  cp "$f" "$OUT_ROOT/svgs/${variant}__$(basename "$f")"
done

echo "==> Building markdown report"
# No --commit: a local run benches the working tree (typically with uncommitted
# changes), so a HEAD SHA in the report header would mislabel what was built.
node "$REPO_ROOT/scripts/bench-report.mjs" \
  --pr "$PR_TP" \
  --base "$BASE_TP" \
  --pr-reports "$PR_OUT" \
  --base-reports "$BASE_OUT" \
  --artifact-url "file://$OUT_ROOT/svgs/" \
  --out "$OUT_ROOT/report.md"

echo
echo "------------------------------------------------------------"
cat "$OUT_ROOT/report.md"
echo "------------------------------------------------------------"
echo
echo "Outputs:"
echo "  Report:  $OUT_ROOT/report.md"
echo "  SVGs:    $OUT_ROOT/svgs/"
echo "  PR raw:  $PR_OUT/  + $PR_TP/"
if [ -n "$BASE_REF" ]; then
  echo "  Base raw: $BASE_OUT/ + $BASE_TP/"
fi
