#!/usr/bin/env bash
# pre-commit-review.sh — Lightweight review gate before commit.
# Non-blocking by default. Set SMART_REVIEW_STRICT=true to fail on HIGH/CRITICAL patterns.

set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
STRICT="${SMART_REVIEW_STRICT:-false}"
COLLECTOR="$PLUGIN_ROOT/scripts/collect-git-context.js"

echo "[Smart Code Review Guardian] Pre-commit review"

if ! command -v node >/dev/null 2>&1; then
  echo "WARN: node not found — skipping automated checks"
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "WARN: not a git repository — skipping"
  exit 0
fi

# Collect staged context only (pre-commit scope)
CONTEXT=$(node "$COLLECTOR" --staged-only 2>/dev/null || true)
if [ -z "$CONTEXT" ]; then
  echo "INFO: no staged changes to review"
  exit 0
fi

HAS_CHANGES=$(echo "$CONTEXT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).hasChanges?'yes':'no')}catch{console.log('no')}})")
if [ "$HAS_CHANGES" != "yes" ]; then
  echo "INFO: no changes detected"
  exit 0
fi

echo "INFO: run /smart-code-review-guardian:review-pr for full AI review"
DIFF_SOURCE=$(echo "$CONTEXT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).diffSource||'unknown')}catch{console.log('unknown')}})")
echo "INFO: diff source: $DIFF_SOURCE"

# Lightweight secret pattern scan on staged diff
STAGED_DIFF=$(git diff --cached 2>/dev/null || true)
ISSUES=0

check_pattern() {
  local pattern="$1"
  local label="$2"
  if echo "$STAGED_DIFF" | grep -qiE "$pattern"; then
    echo "FINDING [$label]: potential issue matching /$pattern/"
    ISSUES=$((ISSUES + 1))
  fi
}

check_pattern 'api[_-]?key\s*=\s*["\x27][a-zA-Z0-9]{16,}' 'CRITICAL-secret'
check_pattern 'password\s*=\s*["\x27][^"\x27]+' 'HIGH-hardcoded-password'
check_pattern 'eval\s*\(' 'HIGH-eval'
check_pattern 'catch\s*\(\s*\)\s*\{\s*\}' 'MEDIUM-empty-catch'

if [ "$ISSUES" -eq 0 ]; then
  echo "PASS: lightweight pre-commit checks"
  exit 0
fi

if [ "$STRICT" = "true" ]; then
  echo "FAIL: strict mode — $ISSUES finding(s). Fix or unset SMART_REVIEW_STRICT."
  exit 1
fi

echo "WARN: $ISSUES finding(s) — commit allowed (non-strict mode)"
exit 0
