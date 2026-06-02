# Commands

Slash commands for Smart Code Review Guardian. When the plugin is loaded, invoke with the plugin namespace:

```
/smart-code-review-guardian:<command-name>
```

Source files live in this directory. Claude Code auto-discovers `*.md` files listed in `.claude-plugin/plugin.json`.

## Command reference

| File | Invocation | Purpose |
| --- | --- | --- |
| `review-pr.md` | `/smart-code-review-guardian:review-pr` | Full review: git diff → specialised subagents → structured PASS/WARN/FAIL report |
| `review-architecture.md` | `/smart-code-review-guardian:review-architecture` | Architecture-only review (layer violations, imports, patterns) |
| `check-tests.md` | `/smart-code-review-guardian:check-tests` | Test coverage gaps, removed/skipped tests, concrete test suggestions |
| `check-docs.md` | `/smart-code-review-guardian:check-docs` | README/docs sync with API, CLI, config, or behaviour changes |
| `run-review-evals.md` | `/smart-code-review-guardian:run-review-evals` | Run local golden-case eval harness |

## Optional arguments

Each command accepts `$ARGUMENTS` for focus, for example:

```
/smart-code-review-guardian:review-pr focus on security
/smart-code-review-guardian:review-architecture imports only
```

## Shared workflow

All review commands (except `run-review-evals`) follow this pattern:

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"`
2. Read changed files and bounded repo context (see `REVIEW_POLICY.md`)
3. Follow the matching skill under `skills/` and/or invoke the matching subagent from `agents/`
4. Output findings using the report structure in `commands/review-pr.md`

## Report format

Full reviews use the template in `review-pr.md`:

- Overall Status: PASS | WARN | FAIL
- Risk Score: 1–10
- Changed Files Reviewed (table)
- Findings (Severity, Category, File, Evidence, Why, Suggested fix)
- Missing Context
- Recommended Next Actions
- Final Decision

Validate output:

```bash
node scripts/validate-review-output.js path/to/report.md
```

## Related

- Policy: [../REVIEW_POLICY.md](../REVIEW_POLICY.md)
- Example output: [../examples/sample-review-output.md](../examples/sample-review-output.md)
- Demo: [../examples/demo-walkthrough.md](../examples/demo-walkthrough.md)
