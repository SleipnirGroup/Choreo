#!/usr/bin/env bash
# CI glue (bench job): render every <variant>/*.traj under the PR and base
# staging dirs to a per-step linear-acceleration-colored SVG (one per side).
# VARIANT comes from the job env (the bench matrix entry). A render failure for
# one trajectory must not fail the job, so each is best-effort.
set -euo pipefail

: "${VARIANT:?VARIANT must be set}"

render() {
  local side=$1 root=$2
  [ -d "$root/$VARIANT" ] || return 0
  for traj in "$root/$VARIANT"/*.traj; do
    name=$(basename "$traj" .traj)
    node scripts/render-traj.mjs --traj "$traj" \
      --out "${traj%.traj}.${side}.svg" \
      --title "${side^^}  ${VARIANT} · ${name}" || true
  done
}

render pr   tp-pr
render base tp-base
