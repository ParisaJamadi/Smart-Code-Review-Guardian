---
description: Check whether changed logic has adequate test coverage, flag missing or removed tests, and suggest concrete test cases.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Shell, Task
---

# /check-tests

Run a test-coverage-focused review on current git changes.

## Steps

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"`.
2. Map changed source files to likely test files using repo conventions (e.g. `*.test.ts`, `tests/`, `__tests__/`).
3. Follow `skills/test-review-skill/SKILL.md` and/or invoke the `test-reviewer` subagent (see `agents/test-reviewer.md`).
4. Report findings under **Tests** category using REVIEW_POLICY.md severity rules.
5. For docs-only changes, expect **PASS** with no missing-test warnings (false-positive guard).

User focus (optional): `$ARGUMENTS`
