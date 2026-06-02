---
description: Run the local evaluation harness against golden review cases. Validates reviewer behaviour and guards against regressions.
disable-model-invocation: true
allowed-tools: Read, Shell
---

# /run-review-evals

Execute the plugin's lightweight evaluation pipeline.

## Steps

1. From the plugin root, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/evals/run-evals.js"
```

2. Present the eval summary to the user:
   - Total cases
   - Passed / failed
   - Per-case explanation
   - Regression summary

3. If any case fails, briefly explain which reviewer behaviour regressed and suggest fixes in skills or agents.

## Notes

- Evals use keyword/category checks against sample reviewer outputs — not live LLM calls.
- For CI, run the same script in strict mode: `node evals/run-evals.js --strict`

See `evals/README.md` for adding new golden cases.

User options (optional): `$ARGUMENTS`
