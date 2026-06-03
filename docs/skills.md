# Skills

Reusable agent instructions for Smart Code Review Guardian. Each skill is a directory with a `SKILL.md` file, auto-discovered from `skills/` per Claude Code plugin conventions.

## Why skills are reusable

Skills are **stack-agnostic workflows**, not one-off prompts:

- Usable from commands (`/review-pr`), subagents, or model auto-invocation
- Reference shared policy (`REVIEW_POLICY.md`) and scripts (`collect-git-context.js`)
- Composable: `code-review-skill` orchestrates specialised skills
- Portable across repositories — no hardcoded paths to a single codebase
- Guardrails embedded (no hallucination, bounded context, Missing Context)

## Skill reference

| Skill | Directory | Use when |
| --- | --- | --- |
| `code-review-skill` | `code-review-skill/` | Full PR/local review orchestration |
| `architecture-review-skill` | `architecture-review-skill/` | Layer violations, import analysis |
| `test-review-skill` | `test-review-skill/` | Test coverage and regression gaps |
| `documentation-review-skill` | `documentation-review-skill/` | Docs/API/CLI/config sync |

## Invocation

| Method | Example |
| --- | --- |
| Command | `/smart-code-review-guardian:review-pr` reads `code-review-skill` |
| Subagent | `architecture-reviewer` loads `architecture-review-skill` via frontmatter |
| Model-invoked | Claude applies skill when task matches `description` in frontmatter |

## Extending for your team

1. Copy a skill directory (e.g. `architecture-review-skill/`)
2. Add team-specific rules citing your `ARCHITECTURE.md`
3. Register in a dependent plugin or override via marketplace fork
4. Add golden cases to `evals/` for your conventions

## Related

- Commands: [commands.md](commands.md)
- Agents: [agents.md](agents.md)
- Policy: [../REVIEW_POLICY.md](../REVIEW_POLICY.md)
