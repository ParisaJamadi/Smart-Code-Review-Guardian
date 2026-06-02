---
name: test-review-skill
description: Maps changed code to tests, detects missing coverage and removed tests, suggests concrete test cases. Use when reviewing logic changes or running /check-tests.
---

# Test Review Skill

Ensure changed behaviour has appropriate automated test coverage.

## Step 1 — Identify test-worthy changes

| Change type | Review depth |
| --- | --- |
| New/changed functions, classes, handlers | Full test mapping |
| Bug fix | Require regression test |
| Refactor (no behaviour change) | Verify existing tests still apply |
| Docs/comments/config comments only | **No missing-test warning** (false-positive guard) |
| Deleted production code | Check if tests removed appropriately |

## Step 2 — Discover test conventions

Glob for patterns (stop after finding repo convention):

```
**/*.test.{js,ts,jsx,tsx}
**/*.spec.{js,ts}
**/__tests__/**
**/tests/**
**/*_test.go
**/test_*.py
```

Note convention in output if ambiguous.

## Step 3 — Map source → tests

| Source | Likely test location |
| --- | --- |
| `src/foo/bar.ts` | `src/foo/bar.test.ts`, `tests/foo/bar.test.ts` |
| `lib/utils.py` | `tests/test_utils.py`, `lib/utils_test.py` |

**Verify** test file exists before claiming coverage.

## Step 4 — Analyse diff for gaps

Check for:

- New exported functions without new/changed tests
- Changed return types or error paths without edge case tests
- Removed assertions or entire test files
- `@pytest.mark.skip`, `it.skip`, `xdescribe`, `TODO: fix test`

## Step 5 — Suggest concrete tests

Bad: "Add unit tests."

Good:

```
Suggested test: `describe('calculateDiscount')` in `src/pricing.test.ts`
- returns 0 when amount is negative
- applies tiered rate when customerType is 'enterprise'
- throws PricingError when currency unsupported
```

## Severity guide

| Situation | Severity |
| --- | --- |
| Critical path logic, no tests | HIGH |
| New util with no tests | MEDIUM |
| Missing edge case, core path covered | LOW |
| Docs-only change flagged | **False positive — do not report** |

## Missing Context

List when:

- Test framework unknown
- Cannot locate test directory
- Change is generated code

## Guardrails

- Never claim "tests pass" — you did not run CI unless user asked
- Never invent test file paths
- Docs-only → explicitly PASS test review
