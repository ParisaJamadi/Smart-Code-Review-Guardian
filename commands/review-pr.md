---
description: Run a full AI-native code review on staged, working-tree, or branch diff. Produces a structured PASS/WARN/FAIL report with risk score and actionable findings.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Shell, Task
---

# /review-pr — Smart Code Review Guardian

Perform a production-quality code review of the current changes. Follow **REVIEW_POLICY.md** and the **code-review-skill** (`skills/code-review-skill/SKILL.md`).

## User arguments

Optional focus from the user: `$ARGUMENTS`

If provided, prioritise that scope (e.g. "security only", "focus on auth module").

## Workflow

### 1. Gather git context

Run the context collector (preferred) or equivalent git commands:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"
```

If the script fails, manually run:

- `git status --porcelain=v1`
- `git branch --show-current`
- Determine diff source per REVIEW_POLICY.md (staged → working tree → vs main/master)

Record: diff source, base branch, list of changed files.

### 2. Load repository context (bounded)

Read **only** what is needed — do not scan the entire repo:

| Priority | Paths |
| --- | --- |
| High | Changed files from diff |
| Medium | `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `docs/` (relevant sections) |
| Low | `package.json`, `pyproject.toml`, `requirements.txt`, test dirs matching changed modules |

Use Glob/Grep to locate test files and architecture docs — never assume paths exist.

### 3. Categorise changes by risk

For each changed file assign **Change Type** (added/modified/deleted/renamed) and **Risk Level** (LOW/MEDIUM/HIGH/CRITICAL) per REVIEW_POLICY.md.

### 4. Invoke specialised review workflows

Use the Task tool to run subagents in parallel when changes warrant it:

| Subagent | When |
| --- | --- |
| `architecture-reviewer` | Production code, new modules, imports, layering |
| `test-reviewer` | Logic, behaviour, or API changes |
| `documentation-reviewer` | Public API, CLI, config, env vars |
| `risk-reviewer` | Always for non-docs-only changes |

Each subagent definition lives in `agents/`. Pass each agent: diff summary, changed file list, and relevant file contents only.

Alternatively, follow the corresponding skills directly if Task/subagents are unavailable.

### 5. Synthesise report

Output **exactly** this structure (fill all sections):

```markdown
# Smart Code Review Guardian Report

Overall Status: PASS | WARN | FAIL
Risk Score: 1-10

## Summary

Short paragraph.

## Changed Files Reviewed

| File | Change Type | Risk Level | Notes |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

## Findings

### Finding 1
- **Severity:** LOW | MEDIUM | HIGH | CRITICAL
- **Category:** Architecture | Tests | Documentation | Security | Maintainability | Reliability
- **File:**
- **Evidence:**
- **Why it matters:**
- **Suggested fix:**

(repeat for each finding)

## Missing Context

List anything the plugin could not verify.

## Recommended Next Actions

- [ ] Actionable checklist items

## Final Decision

**PASS/WARN/FAIL** — one-sentence justification.
```

### 6. Validate output (optional but recommended)

After producing the report, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-review-output.js" --stdin
```

Or save report to a temp file and validate. Fix structural issues before presenting final report.

## Guardrails

- Never hallucinate files, tests, or team standards.
- Cite evidence from diff or files you actually read.
- State **Missing Context** when unsure.
- Do not rewrite code unless the user explicitly asks.
- Do not run destructive git commands or install packages.

## Reference

- Policy: `${CLAUDE_PLUGIN_ROOT}/REVIEW_POLICY.md`
- Skill: `${CLAUDE_PLUGIN_ROOT}/skills/code-review-skill/SKILL.md`
- Example output: `${CLAUDE_PLUGIN_ROOT}/examples/sample-review-output.md`
