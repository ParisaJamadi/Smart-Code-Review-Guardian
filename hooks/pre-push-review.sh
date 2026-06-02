#!/usr/bin/env bash
# pre-push-review.sh — Lightweight review gate before push.
# Non-blocking by default. Set SMART_REVIEW_STRICT=true to fail on HIGH/CRITICAL patterns.

set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
STRICT="${SMART_REVIEW_STRICT:-false}"
COLLECTOR="$PLUGIN_ROOT/scripts/collect-git-context.js"

echo "[Smart Code Review Guardian] Pre-push review"

if ! command -v node >/dev/null 2>&1; then
  echo "WARN: node not found — skipping"
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "WARN: not a git repository — skipping"
  exit 0
fi

CONTEXT=$(node "$COLLECTOR" 2>/dev/null || true)
if [ -z "$CONTEXT" ]; then
  echo "INFO: no changes vs base branch"
  exit 0
fi

echo "INFO: run /smart-code-review-guardian:review-pr before merging"
echo "TIP: node $PLUGIN_ROOT/evals/run-evals.js — verify reviewer harness"

# Check for skipped/disabled tests in branch diff
BASE=$(echo "$CONTEXT" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).baseBranch" 2>/dev/null || echo "main")
DIFF=$(git diff "${BASE}...HEAD" 2>/dev/null || git diff main...HEAD 2>/dev/null || true)

ISSUES=0
if echo "$DIFF" | grep -qE '\.(skip|only)\(|it\.skip|describe\.skip|@pytest\.mark\.skip|xdescribe|xit'; then
  echo "FINDING [MEDIUM]: skipped or focused tests detected in branch diff"
  ISSUES=$((ISSUES + 1))
fi

if echo "$DIFF" | grep -qiE 'api[_-]?key\s*=\s*["\x27][a-zA-Z0-9]{16,}'; then
  echo "FINDING [CRITICAL]: possible secret in branch diff"
  ISSUES=$((ISSUES + 1))
fi

if [ "$ISSUES" -eq 0 ]; then
  echo "PASS: lightweight pre-push checks"
  exit 0
fi

if [ "$STRICT" = "true" ]; then
  echo "FAIL: strict mode — $ISSUES finding(s)"
  exit 1
fi

echo "WARN: $ISSUES finding(s) — push allowed (non-strict mode)"
exit 0
