---
name: documentation-review-skill
description: Checks whether README and docs need updates when APIs, CLI, config, or behaviour change. Use for documentation gap analysis or /check-docs.
---

# Documentation Review Skill

Keep user-facing documentation aligned with code changes.

## Triggers — when docs likely need updates

| Signal in diff | Docs to check |
| --- | --- |
| New/changed CLI flag or command | README, `docs/cli.md`, `--help` strings |
| New env var or config key | README, `.env.example`, deployment docs |
| Public API endpoint change | OpenAPI/Swagger, README API section |
| Changed default behaviour | README, migration guide, CHANGELOG |
| New dependency requiring setup | README install section |
| Breaking change | CHANGELOG, migration doc |

## Step 1 — Determine visibility

**User-visible** → doc review required  
**Internal-only** (private helpers, refactors) → note "no doc update required" unless exports changed

## Step 2 — Read existing docs (if present)

- `README.md`
- `docs/**/*.md`
- `CHANGELOG.md`
- OpenAPI / JSON schema files referenced in repo

Do not assume content — read relevant sections only.

## Step 3 — Gap analysis

For each user-visible change without doc update in diff:

```
Severity: MEDIUM
Category: Documentation
File: README.md (missing update)
Evidence: diff adds `--dry-run` flag in src/cli.ts but README CLI section unchanged
Suggested fix: Add `--dry-run` to CLI options table with description and example
```

## Docs-only changes

If **only** documentation files changed:

- Overall documentation review: **PASS**
- Do not require code changes

## Output checklist format

Recommended next actions should name files:

- [ ] Update `README.md` § Installation with new `REDIS_URL` variable
- [ ] Add entry to `CHANGELOG.md` under Unreleased

## Guardrails

- Cite exact doc file paths
- Do not require updating docs for comment-only code changes
- If no README exists, suggest creating one only when public project signals exist (package.json, etc.)
