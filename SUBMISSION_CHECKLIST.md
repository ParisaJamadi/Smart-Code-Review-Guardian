# Submission checklist

Maps the technical challenge requirements to implemented artifacts. Use before submitting.

## Core components (need ≥3)

| Requirement | Status | Location |
| --- | --- | --- |
| Custom commands | ✅ | `commands/` (5 commands + `commands/README.md`) |
| Skills | ✅ | `skills/` (4 skills + `skills/README.md`) |
| Subagents | ✅ | `agents/` (4 agents + `agents/README.md`) |
| Hooks | ✅ | `hooks/` (pre-commit, pre-push, `hooks.json`, `hooks/README.md`) |
| Evaluations | ✅ | `evals/` (5 golden cases, `run-evals.js`) |

## Plugin manifest

| Check | Status | Notes |
| --- | --- | --- |
| `plugin.json` exists | ✅ | `.claude-plugin/plugin.json` (Claude Code standard path) |
| Name, version, description | ✅ | Complete |
| Component paths declared | ✅ | commands, agents, skills, hooks, mcpServers |
| Placeholder URLs removed | ✅ | No fake homepage/repository fields |

## `/review-pr` behaviour

| Check | Status | Location |
| --- | --- | --- |
| Git status / diff collection | ✅ | `scripts/collect-git-context.js`, `commands/review-pr.md` |
| Diff priority (staged → working → branch) | ✅ | `REVIEW_POLICY.md`, collector script |
| Bounded repo context | ✅ | `skills/code-review-skill/SKILL.md` |
| Specialised subagents | ✅ | `agents/*.md` |
| Structured report format | ✅ | `commands/review-pr.md`, `examples/sample-review-output.md` |
| PASS/WARN/FAIL + risk score | ✅ | `REVIEW_POLICY.md` |
| Hallucination guardrails | ✅ | Skills, agents, Missing Context section |
| Report validation script | ✅ | `scripts/validate-review-output.js` |

## Documentation

| Document | Required sections | Status |
| --- | --- | --- |
| `README.md` | Problem, install, usage, architecture, eval, limitations | ✅ |
| `REFLECTION.md` | All 7 reflection questions | ✅ |
| `AI_PROMPTS.md` | Design, commands, agents, evals, README, validation notes | ✅ |
| `REVIEW_POLICY.md` | Scoring rubric | ✅ |
| Demo walkthrough | `examples/demo-walkthrough.md`, `examples/scenario-demo-walkthrough.md` | ✅ |

## Verification commands

Run from repository root:

```bash
npm run verify
```

Expected: evals 5/5 pass, sample report validates.

```bash
node scripts/collect-git-context.js
```

Expected: JSON with `diffSource`, `changedFiles` (exit 2 if no changes — normal on clean tree).

```bash
claude --plugin-dir .
```

Expected: plugin loads; `/smart-code-review-guardian:review-pr` available.

## Known conventions

- Commands are namespaced: `/smart-code-review-guardian:review-pr`
- Manifest is at `.claude-plugin/plugin.json`, not repository root (Claude Code requirement)
- MCP stub requires no credentials (`mcp/review-context-stub.js`)
- Git hook scripts (`.sh`) require Git Bash or WSL on Windows; Claude Code hook uses Node
