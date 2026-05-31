#!/usr/bin/env bash
# CI glue (resolve job): emit a JSON array of test-projects/* variants that
# contain a project.chor as a `variants=[...]` line on $GITHUB_OUTPUT — this
# feeds the dynamic bench matrix. Fails if none are found.
set -euo pipefail

list=$(for d in test-projects/*/; do
  v=$(basename "$d")
  [ -f "$d/project.chor" ] && printf '%s\n' "$v"
done | jq -R . | jq -cs .)

if [ "$list" = "[]" ]; then
  echo "no variants with project.chor found under test-projects/" >&2
  exit 1
fi

echo "variants=$list" >> "$GITHUB_OUTPUT"
echo "matrix: $list"
