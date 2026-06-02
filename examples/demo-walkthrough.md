# Demo Walkthrough — Smart Code Review Guardian

Step-by-step demo for technical review (~5 minutes).

## Prerequisites

- [Claude Code](https://code.claude.com) installed
- Node.js 18+ (for scripts and evals)
- Git repository with local changes (or use this plugin repo)

## 1. Load the plugin locally

```bash
cd smart-code-review-guardian
claude --plugin-dir .
```

In Claude Code, run `/reload-plugins` if already in a session.

## 2. Verify plugin components

```bash
# List commands (in Claude Code)
/help

# Expected commands (namespaced):
# /smart-code-review-guardian:review-pr
# /smart-code-review-guardian:review-architecture
# /smart-code-review-guardian:check-tests
# /smart-code-review-guardian:check-docs
# /smart-code-review-guardian:run-review-evals
```

Check agents appear in `/agents`:

- architecture-reviewer
- test-reviewer
- documentation-reviewer
- risk-reviewer

## 3. Collect git context (script demo)

```bash
node scripts/collect-git-context.js
```

Show JSON output: `diffSource`, `changedFiles`, truncated `diff`.

## 4. Run evaluations (no LLM required)

```bash
npm run verify
# Or: node evals/run-evals.js
```

Highlight: 5/5 golden cases pass — missing tests, architecture, docs, false-positive guard, secrets.

## 5. Full PR review (AI demo)

Make a small change in any repo:

```bash
echo "// TODO: fix later" >> src/example.js
git add src/example.js
```

In Claude Code:

```
/smart-code-review-guardian:review-pr
```

Walk through the structured report:

- Overall Status / Risk Score
- Changed Files table
- Findings with evidence
- Missing Context (honest uncertainty)
- Final Decision

## 6. Specialised commands

```
/smart-code-review-guardian:check-tests
/smart-code-review-guardian:review-architecture focus on imports
```

## 7. Validate report structure

Save report to a file, then:

```bash
# macOS/Linux
node scripts/validate-review-output.js /tmp/report.md

# Windows
node scripts/validate-review-output.js report.md
```

## 8. Hooks (optional)

```bash
# Git Bash / WSL / macOS / Linux
SMART_REVIEW_STRICT=false bash hooks/pre-commit-review.sh
SMART_REVIEW_STRICT=true bash hooks/pre-push-review.sh
```

Explain: non-strict warns; strict fails on HIGH/CRITICAL pattern matches.

## 9. MCP stub (optional)

Plugin ships `.mcp.json` with `review-context-stub` — returns stub JSON for future GitHub/CI integration without credentials.

## Talking points for reviewers

1. **Reusable harness** — skills, agents, commands, hooks, evals — not a one-off script
2. **Context engineering** — bounded reads, diff-first, Missing Context section
3. **Guardrails** — no hallucinated files/tests; REVIEW_POLICY.md scoring
4. **Eval discipline** — golden cases with false-positive guard
5. **DX** — PASS/WARN/FAIL, actionable fixes, validate script

## Related documents

- [scenario-demo-walkthrough.md](scenario-demo-walkthrough.md) — Three PR scenarios for challenge submission (missing tests, architecture, secret + docs)
- [sample-review-output.md](sample-review-output.md) — Combined multi-finding report example

## Cleanup

```bash
git checkout -- .
```
