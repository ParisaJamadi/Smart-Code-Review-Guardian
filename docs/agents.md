# Subagents

Specialised reviewers invoked by `/review-pr` or focused commands. Definitions are markdown files with YAML frontmatter in this directory.

## Agent reference

| Agent | File | Invoked by | Scope |
| --- | --- | --- | --- |
| `architecture-reviewer` | `architecture-reviewer.md` | `/review-pr`, `/review-architecture` | Layer violations, imports, circular deps |
| `test-reviewer` | `test-reviewer.md` | `/review-pr`, `/check-tests` | Missing tests, skipped tests, regression gaps |
| `documentation-reviewer` | `documentation-reviewer.md` | `/review-pr`, `/check-docs` | README/docs out of sync with public surface |
| `risk-reviewer` | `risk-reviewer.md` | `/review-pr` | Security, secrets, AI-generated code smells |

## Scope boundaries (all agents)

Each agent is **bounded** to prevent scope creep and hallucination:

- **Input scope:** Changed files from diff + directly related test/doc files only
- **Read limit:** Do not scan the full repository; use Glob with narrow patterns
- **Write limit:** `disallowedTools: Write, Edit` — review only, no code changes
- **Turn limit:** `maxTurns: 12–15` per agent
- **Evidence rule:** Every finding requires file path + quoted or diff evidence
- **Output:** Findings list only — orchestrator merges into full report

## Pairing with skills

Each agent references a matching skill for reusable instructions:

| Agent | Skill |
| --- | --- |
| `architecture-reviewer` | `architecture-review-skill` |
| `test-reviewer` | `test-review-skill` |
| `documentation-reviewer` | `documentation-review-skill` |
| `risk-reviewer` | `code-review-skill` (risk section) |

Skills can also be used standalone without spawning a subagent.

## Manual invocation

In Claude Code, agents appear under `/agents`. The orchestrating command uses the Task tool with `subagent_type` matching the agent name when parallel review is needed.

## Eval coverage

Golden cases in `evals/golden-cases.json` map one-to-one to reviewer behaviour:

- `architecture-violation` → architecture-reviewer
- `missing-test` → test-reviewer
- `documentation-gap` → documentation-reviewer
- `false-positive-guard` → test-reviewer
- `secret-detection` → risk-reviewer
