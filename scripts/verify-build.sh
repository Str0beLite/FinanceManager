#!/usr/bin/env bash
#
# Checks that a built site is actually deployable before it ships.
#
# A build can succeed while producing something that renders blank once served
# from its real path — that is exactly how the first Pages deploy failed — so
# this asserts the three things that have to hold.
#
# Usage: scripts/verify-build.sh <dist-dir> <base-path>
#   e.g. scripts/verify-build.sh dist /FinanceManager/
set -euo pipefail

dist="${1:?usage: verify-build.sh <dist-dir> <base-path>}"
base="${2:?usage: verify-build.sh <dist-dir> <base-path>}"

fail() {
  echo "::error::$1"
  exit 1
}

[ -f "$dist/index.html" ] || fail "$dist/index.html does not exist."

# 1. The built page must load the bundle, not the TypeScript source entry.
if grep -q 'src="/src/main.tsx"' "$dist/index.html"; then
  fail "$dist/index.html still points at the TS source entry — this is the unbuilt file."
fi

# 2. Assets must be referenced under the base path the site is served from.
refs=$(grep -o "${base}assets/[^\"]*" "$dist/index.html" || true)
[ -n "$refs" ] || fail "$dist/index.html has no ${base}assets/ references — wrong base path."

# 3. Every referenced asset must actually be in the artifact.
while IFS= read -r ref; do
  path="$dist/${ref#"$base"}"
  [ -f "$path" ] || fail "$dist/index.html references $ref but $path is missing."
done <<< "$refs"

echo "$dist: $(echo "$refs" | wc -l) asset(s) under $base, all present."
