# Smart Code Review Guardian — Review Policy

This document defines how reviews are scored, categorised, and decided. Agents and commands in this plugin must follow these rules.

## Scope

Reviews cover **changed code only** unless explicitly expanding scope for context (e.g. reading `ARCHITECTURE.md`). Do not review unrelated files.

## Diff source priority

1. **Staged changes** — if `git diff --cached` has output, review staged diff.
2. **Working tree** — if unstaged changes exist, review working tree diff.
3. **Branch comparison** — compare current branch to `main`, `master`, or `origin/main` / `origin/master` (first available).

Always record which diff source was used in the report.

## Risk levels (per file)

| Level | Criteria |
| --- | --- |
| **LOW** | Docs-only, comments, formatting, test-only changes with no production logic change |
| **MEDIUM** | Internal refactors, non-public API changes, config with defaults unchanged |
| **HIGH** | Public API, auth, payments, data models, migrations, dependency upgrades |
| **CRITICAL** | Security-sensitive paths, secrets, crypto, permissions, destructive ops |

## Finding severity

| Severity | When to use |
| --- | --- |
| **LOW** | Style, minor maintainability, optional improvements |
| **MEDIUM** | Missing tests for non-critical paths, doc nits, moderate architecture smell |
| **HIGH** | Missing tests for critical logic, layer violations, unsafe patterns |
| **CRITICAL** | Secrets, injection, auth bypass, data loss, production-breaking change |

## Categories

- **Architecture** — layer violations, circular deps, pattern bypass
- **Tests** — missing coverage, removed/skipped tests, behaviour change without regression tests
- **Documentation** — README, API docs, env vars, CLI flags out of sync
- **Security** — secrets, unsafe eval/exec, broad permissions, unchecked external input
- **Maintainability** — dead code, over-abstraction, unclear naming
- **Reliability** — error handling, race conditions, fragile assumptions

## Overall status

| Status | Rule |
| --- | --- |
| **PASS** | No HIGH or CRITICAL findings; MEDIUM findings are acceptable with clear notes |
| **WARN** | One or more MEDIUM findings, or HIGH findings with mitigations documented |
| **FAIL** | Any CRITICAL finding, or multiple HIGH findings without mitigation |

## Risk score (1–10)

- **1–3** — Low risk (docs, tests-only, trivial fixes)
- **4–6** — Moderate (refactors, internal API, partial test gaps)
- **7–8** — High (public API, security-adjacent, missing critical tests)
- **9–10** — Critical (secrets, auth, data integrity, no tests on risky paths)

## Evidence requirements

Every finding **must** include:

- Exact file path (verified to exist)
- Line reference or diff hunk when possible
- Quoted or paraphrased evidence from the change

If evidence cannot be verified, move the item to **Missing Context**, not Findings.

## Hallucination guardrails

- Never cite files not present in the diff or confirmed via read/glob.
- Never claim a test file exists unless found.
- Never invent team standards; cite repo docs or label as **inferred from structure**.
- Prefer **"could not verify"** over guessing.

## Strict mode (hooks / CI)

When `SMART_REVIEW_STRICT=true`:

- Exit non-zero on any **HIGH** or **CRITICAL** finding in automated checks.
- Otherwise warn only and exit 0.

## Subagent invocation

Full PR review (`/smart-code-review-guardian:review-pr`) should consult:

1. Architecture reviewer — for non-doc, non-test-only production changes
2. Test reviewer — when logic or behaviour changes
3. Documentation reviewer — when public surface, config, or CLI changes
4. Risk reviewer — always for production code changes

Specialised commands may invoke a single sub-workflow.
