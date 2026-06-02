---
name: code-review-skill
description: Orchestrates AI-native PR and local diff reviews. Gathers bounded git context, runs specialised sub-workflows, and produces structured PASS/WARN/FAIL reports. Use for code review, PR review, pre-merge checks, or when /review-pr is invoked.
---

# Code Review Skill

Master workflow for Smart Code Review Guardian. Read **REVIEW_POLICY.md** before every review.

**Reusable across repositories:** This skill references policy and scripts via `${CLAUDE_PLUGIN_ROOT}` or relative paths — no hardcoded project names. Teams can fork and add a `policy/` overlay without changing orchestration logic.

## When to use

- Full PR or local change review
- Pre-merge quality gate
- User asks to review a diff, branch, or staged changes

## Phase 1 — Gather context (bounded)

### Git context

Prefer the helper script:

```bash
node scripts/collect-git-context.js
```

Parse JSON output for: `diffSource`, `baseBranch`, `changedFiles`, `diff`.

### Diff source priority

1. Staged (`git diff --cached`) if any staged files
2. Working tree (`git diff`) if unstaged changes
3. Branch vs default (`main` / `master` / `origin/main` / `origin/master`)

Always document which source was used.

### Repository context (read selectively)

| Need | Paths to check (if exist) |
| --- | --- |
| Project norms | `README.md`, `CONTRIBUTING.md` |
| Architecture | `ARCHITECTURE.md`, `docs/architecture/` |
| Dependencies | `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod` |
| Tests layout | `tests/`, `test/`, `__tests__/`, `*_test.go`, `*.test.*` |

**Limit reads** to changed files + directly related test/doc files. Do not load entire codebase.

## Phase 2 — Analyse diff

For each changed file:

1. Confirm file exists
2. Classify: added | modified | deleted | renamed
3. Assign risk: LOW | MEDIUM | HIGH | CRITICAL (see REVIEW_POLICY.md)
4. Note change summary in one line

Skip deep analysis for generated files, lockfiles-only, or pure formatting unless user requested.

## Phase 3 — Specialised sub-workflows

Invoke subagents (Task tool) or follow sibling skills in parallel when appropriate:

| Skill / Agent | Trigger |
| --- | --- |
| `architecture-review-skill` / `architecture-reviewer` | Production code, imports, new modules |
| `test-review-skill` / `test-reviewer` | Logic, APIs, behaviour changes |
| `documentation-review-skill` / `documentation-reviewer` | Public surface, CLI, config, env |
| `risk-reviewer` | Any non-trivial production change |

Merge sub-agent outputs; deduplicate findings.

## Phase 4 — Produce structured output

Use the exact report template from REVIEW_POLICY.md / `commands/review-pr.md`:

- Overall Status: PASS | WARN | FAIL
- Risk Score: 1–10
- Changed Files table
- Findings with Severity, Category, File, Evidence, Why, Suggested fix
- Missing Context
- Recommended Next Actions (checklist)
- Final Decision (one sentence)

Optional validation:

```bash
node scripts/validate-review-output.js report.md
```

## Guardrails

| Rule | Rationale |
| --- | --- |
| Never assume a file exists without checking | Prevents hallucinated paths |
| Never claim a test exists unless found | Prevents false confidence |
| Never claim a standard exists unless in repo docs or labelled inferred | Prevents invented policies |
| Prefer "could not verify" over guessing | Honest uncertainty |
| Do not rewrite large files unless asked | Review ≠ refactor |
| Do no destructive commands (`reset --hard`, force push) | Safety |
| Do not install packages automatically | User control |
| Do not expose secrets in output | Redact sensitive values |
| Keep findings actionable and concise | Developer experience |

## Anti-patterns to avoid

- Reviewing files not in the diff without justification
- Generic findings ("improve error handling") without file/line evidence
- FAIL status for style-only nits
- PASS when CRITICAL security issue present

## Quick decision tree

```
Changes present?
  No → Report "no changes to review"
  Yes → Docs only?
    Yes → Light doc review; likely PASS
    No → Run test + risk + architecture as applicable
         → Synthesise report
         → Apply PASS/WARN/FAIL rules
```
