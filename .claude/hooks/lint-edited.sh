#!/usr/bin/env bash
# Format, lint and typecheck the file Claude just edited and hand problems back (exit 2), so they
# are fixed in the same turn instead of at the end.
set -uo pipefail
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.ts) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
problems=""
add() { problems="${problems}${problems:+$'\n'}$1"; }
out=$(./node_modules/.bin/biome check --write --no-errors-on-unmatched "$file" 2>&1) || add "$out"
out=$(./node_modules/.bin/oxlint --type-aware --format unix "$file" 2>&1) || add "$out"
out=$(./node_modules/.bin/tsc 2>&1) || add "$out"
if [ -n "$problems" ]; then
  printf '%s\n' "$problems" >&2
  exit 2
fi
