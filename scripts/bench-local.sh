#!/usr/bin/env bash
# Local equivalent of .github/workflows/benchmark.yml — runs the bench pipeline
# against your working tree, optionally comparing to a base git ref, and writes
# everything (SVGs + reports + markdown) into ./bench-local/.
#
# Usage:
#   scripts/bench-local.sh              # PR-only run, no comparison
#   scripts/bench-local.sh <base-ref>   # full comparison vs <base-ref> (e.g. main)
#
# Requires: cargo, node, and `timeout` (GNU coreutils — run-bench.sh caps each
# run at 20m). The base build uses `git worktree` so your current checkout stays
# untouched.

set -euo pipefail

REPO_ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
cd "$REPO_ROOT"

BASE_REF=${1:-}
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
for cmd in cargo node timeout; do
  command -v "$cmd" >/dev/null || { echo "missing required command: $cmd" >&2; exit 1; }
done

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

echo "==> Running PR benchmark"
bash "$REPO_ROOT/scripts/run-bench.sh" "$OUT_ROOT/cli-pr" "$PR_TP" "$PR_OUT"

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

  echo "==> Running base benchmark"
  bash "$REPO_ROOT/scripts/run-bench.sh" "$OUT_ROOT/cli-base" "$BASE_TP" "$BASE_OUT" || true
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
