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

# --- Narrow test: install.html's notary payload description vs the real
# NotaryBody interface in juro/src/routes/notary.ts (a sibling repo, not
# checked out here — so the expected list is hardcoded and must be kept in
# sync by hand). This is the exact gap that let the SHA-256-fingerprint
# overclaim through: check-claim-backing verifies claimed things exist, not
# that a described payload matches the actual payload.
#
# Checked 2026-08-11 against juro/src/routes/notary.ts NotaryBody (matches
# juro/src/db/scan_notarizations.ts ScanNotarizationInput too). If that
# interface changes, update EXPECTED_NOTARY_FIELDS here in the same PR.
EXPECTED_NOTARY_FIELDS="agent_version,bundle_sha256,engagement_slug_hash,ruleset_sha,scanned_at"

extract_notary_fields() {
  grep -oE 'sends five fields:[^.]*\.' "$1" 2>/dev/null \
    | grep -oE '[a-z][a-z0-9]*(_[a-z0-9]+)+' \
    | sort -u \
    | tr '\n' ',' \
    | sed 's/,$//'
}

for file in "$@"; do
  [[ "$(basename "$file")" == "install.html" ]] || continue
  actual="$(extract_notary_fields "$file")"
  if [[ -z "$actual" ]]; then
    echo "⚠️  notary-field check: no \"sends N fields:\" sentence found in $file — skipping (wording may have changed; update this script's extraction pattern)"
  elif [[ "$actual" != "$EXPECTED_NOTARY_FIELDS" ]]; then
    echo "🚨 NOTARY FIELD MISMATCH in $file"
    echo "   install.html describes: $actual"
    echo "   juro NotaryBody has:    $EXPECTED_NOTARY_FIELDS"
    echo "   (per juro/src/routes/notary.ts — update EXPECTED_NOTARY_FIELDS in this script if that interface changed)"
    FAIL=1
  fi
done

if [[ "$FAIL" -eq 0 ]]; then
  echo "check-claim-backing: clean — no unbacked infrastructure claims found."
fi

exit "$FAIL"
