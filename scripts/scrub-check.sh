#!/usr/bin/env bash
# Fails if any file git would publish contains a banned string, or if an
# image file name looks like a stock photo.
#
# The banned strings are not stored in this repository. They come from
# the SCRUB_PATTERNS environment variable (one extended regex per line,
# for CI secrets) or, if unset, from the gitignored file .scrub-patterns.
# Lines starting with # and blank lines are ignored.

set -euo pipefail
cd "$(dirname "$0")/.."

GREP=/usr/bin/grep
STOCK='getty|shutterstock|istock|adobestock'
IMAGE_EXT='\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic)$'

patterns=$(mktemp)
trap 'rm -f "$patterns"' EXIT

if [ -n "${SCRUB_PATTERNS:-}" ]; then
  printf '%s\n' "$SCRUB_PATTERNS" > "$patterns.raw"
elif [ -f .scrub-patterns ]; then
  cp .scrub-patterns "$patterns.raw"
else
  echo "scrub-check: no patterns. Set SCRUB_PATTERNS or create .scrub-patterns." >&2
  exit 2
fi
$GREP -v -E '^[[:space:]]*(#|$)' "$patterns.raw" > "$patterns" || true
rm -f "$patterns.raw"
if [ ! -s "$patterns" ]; then
  echo "scrub-check: pattern list is empty." >&2
  exit 2
fi

files=()
while IFS= read -r -d '' f; do
  [ -f "$f" ] && files+=("$f")
done < <(git ls-files -z --cached --others --exclude-standard)

if [ "${#files[@]}" -eq 0 ]; then
  echo "scrub-check: no files to scan."
  exit 0
fi

fail=0

# Banned strings in file contents.
if $GREP -n -H -i -E -f "$patterns" -- "${files[@]}"; then
  fail=1
fi

# Banned strings in file paths.
if printf '%s\n' "${files[@]}" | $GREP -i -E -f "$patterns" | sed 's/^/path: /'; then
  fail=1
fi

# Image files named like stock photos.
if printf '%s\n' "${files[@]}" | $GREP -i -E "$IMAGE_EXT" | $GREP -i -E "$STOCK" | sed 's/^/stock image: /'; then
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "scrub-check: FAILED (${#files[@]} files scanned)" >&2
  exit 1
fi
echo "scrub-check: OK (${#files[@]} files scanned)"
