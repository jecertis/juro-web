#!/usr/bin/env bash
# check-claim-backing.sh
#
# Crude positive-claim checker, complementary to check-banned-claims.sh.
# banned-claims checks for phrases that are always wrong; this checks for
# phrases that are conditionally wrong — a claim about a capability that
# doesn't exist yet. BL-ENG-149 (published copy asserted a "public notary
# log" that was never built) is the case this exists to catch.
#
# Reads .github/scripts/shipped-capabilities.txt. For every row marked
# "no", if its phrase-regex matches a file, that's an unbacked claim.
# "yes" rows are informational only — not enforced as required-present.
#
# Usage:
#   ./check-claim-backing.sh <file> [<file>...]
#
# Exits 0 if clean, 1 if any unbacked claim is found.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/shipped-capabilities.txt"

if [[ ! -f "$MANIFEST" ]]; then
  echo "check-claim-backing.sh: manifest not found at $MANIFEST" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <file> [<file>...]" >&2
  exit 1
fi

FAIL=0

# Read manifest rows where shipped == "no". Fields separated by " ::: "
# (not "|" — the regex column needs "|" for alternation).
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  [[ "$line" != *" ::: "* ]] && continue

  shipped="$(echo "$line" | awk -F' ::: ' '{print $1}' | xargs)"
  [[ "$shipped" != "no" ]] && continue

  pattern="$(echo "$line" | awk -F' ::: ' '{print $2}')"
  note="$(echo "$line" | awk -F' ::: ' '{print $3}')"

  for file in "$@"; do
    [[ -f "$file" ]] || continue
    if grep -Eiq "$pattern" "$file"; then
      echo "🚨 UNBACKED CLAIM in $file"
      echo "   phrase matched: $pattern"
      echo "   why it's unbacked: $note"
      grep -Ein "$pattern" "$file" | sed 's/^/   line /'
      FAIL=1
    fi
  done
done < "$MANIFEST"

if [[ "$FAIL" -eq 0 ]]; then
  echo "check-claim-backing: clean — no unbacked infrastructure claims found."
fi

exit "$FAIL"
