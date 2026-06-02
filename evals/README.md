# Evaluations

Lightweight local eval harness for Smart Code Review Guardian reviewer behaviour.

## Purpose

Golden cases validate that sample reviewer outputs meet expected patterns — without calling an LLM. This guards against regressions in skills, agents, and prompt templates when you update them.

## Cases

| ID | Scenario | Expected reviewer |
| --- | --- | --- |
| `missing-test` | New function, no test | test-reviewer flags missing test |
| `architecture-violation` | Controller → DB direct | architecture-reviewer flags layer violation |
| `documentation-gap` | New CLI flag | documentation-reviewer flags README gap |
| `false-positive-guard` | Docs-only change | test-reviewer does NOT flag missing tests |
| `secret-detection` | Hardcoded API key | risk-reviewer flags CRITICAL security |

## Run locally

```bash
node evals/run-evals.js
```

Strict mode (alias, same exit behaviour):

```bash
node evals/run-evals.js --strict
```

Exit code: **0** if all pass, **1** if any case fails.

Or via Claude Code:

```
/smart-code-review-guardian:run-review-evals
```

## Files

- `golden-cases.json` — input scenarios and sample output paths
- `expected-results.json` — keyword, category, and severity rules
- `samples/*.md` — reference reviewer outputs (stand-in for LLM output)
- `run-evals.js` — validator script

## Adding a case

1. Add entry to `golden-cases.json`
2. Add rules to `expected-results.json`
3. Add sample output under `samples/`
4. Run `node evals/run-evals.js`

## Limitations

- Does not evaluate live LLM quality — only structural/keyword conformance of reference outputs
- Extend with LLM-as-judge or human review for production eval pipelines

## Future improvements

- Wire evals to actual `/review-pr` runs in CI with cached diffs
- Score precision/recall against labelled PR dataset
- Track eval metrics over time in a dashboard
