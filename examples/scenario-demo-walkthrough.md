# Scenario Demo Walkthrough — Smart Code Review Guardian

This document demonstrates three realistic Pull Request scenarios the plugin is designed to catch **before merge**. Each scenario shows the developer workflow, what the plugin inspects, representative output, productivity impact, and strict-mode behaviour.

**Setup (once per session):**

```bash
claude --plugin-dir ./smart-code-review-guardian
```

---

## Scenario 1 — Missing tests on billing logic

### Context

A developer adds discount calculation for a subscription billing service but does not add or update tests.

### Developer command

```bash
git checkout -b feature/tiered-discount
# ... edit src/billing/discount.ts ...
git add src/billing/discount.ts
/smart-code-review-guardian:review-pr
```

Focused alternative:

```bash
/smart-code-review-guardian:check-tests
```

### Fake git diff summary

```
diff --git a/src/billing/discount.ts b/src/billing/discount.ts
--- a/src/billing/discount.ts
+++ b/src/billing/discount.ts
@@ -0,0 +1,8 @@
+export function calculateDiscount(amount: number, tier: 'standard' | 'gold'): number {
+  if (amount < 0) throw new Error('Amount must be non-negative');
+  const rate = tier === 'gold' ? 0.2 : 0.1;
+  return amount * rate;
+}
```

| File | Change | Tests updated |
| --- | --- | --- |
| `src/billing/discount.ts` | Added (+8 lines) | No |

### What the plugin checks

| Step | Component | Action |
| --- | --- | --- |
| 1 | `collect-git-context.js` | Detects staged diff; lists changed file |
| 2 | `test-reviewer` / `test-review-skill` | Maps `discount.ts` → `discount.test.ts`; confirms no test file change |
| 3 | `risk-reviewer` | Scans for billing-path logic without coverage |
| 4 | `REVIEW_POLICY.md` | Scores missing tests on payment logic as **HIGH** |

The plugin does **not** claim tests exist unless found via Glob. Docs-only changes would not trigger this finding (see eval case `false-positive-guard`).

### Example plugin output

```markdown
# Smart Code Review Guardian Report

Overall Status: WARN
Risk Score: 7

## Summary

New billing function `calculateDiscount` was added without corresponding test changes.
Payment-related logic should not merge without automated coverage.

## Changed Files Reviewed

| File | Change Type | Risk Level | Notes |
| --- | --- | --- | --- |
| src/billing/discount.ts | added | HIGH | Exported billing helper |

## Findings

### Finding 1
- **Severity:** HIGH
- **Category:** Tests
- **File:** src/billing/discount.ts
- **Evidence:** New exported function with validation (`amount < 0`) and tier branching;
  no change to `src/billing/discount.test.ts` or `tests/billing/discount.test.ts`.
- **Why it matters:** Incorrect discount rates or validation bugs directly affect revenue.
- **Suggested fix:** Add tests for negative amount (throws), gold tier (20%), standard tier (10%).

## Missing Context

- CI test results not available — could not verify existing suite status.

## Recommended Next Actions

- [ ] Create `src/billing/discount.test.ts` with tier and validation cases
- [ ] Re-run `/smart-code-review-guardian:review-pr` after adding tests

## Final Decision

**WARN** — High-severity test gap on billing logic; address before merge.
```

### Why this helps developer productivity

- Catches coverage gaps **before** human review cycles and CI failures.
- Suggests **concrete test cases** (not generic “add tests”), reducing back-and-forth.
- Developer fixes locally in minutes instead of waiting for a reviewer comment thread.

### Strict mode behaviour

| Layer | Behaviour |
| --- | --- |
| **Git hook** (`pre-commit-review.sh`) | No regex match for this diff → hook **PASS** (warn-only). Full test analysis requires `/review-pr`. |
| **`SMART_REVIEW_STRICT=true` on hook** | Still **PASS** — lightweight hooks do not detect missing tests. |
| **Team policy (recommended)** | Treat plugin **WARN** on billing paths as merge-blocking in branch protection, even when hooks pass. |

Strict hooks target secrets and risky patterns; missing-test detection is the AI review’s strength. Teams can wire `/review-pr` output validation into CI for HIGH **Tests** findings.

---

## Scenario 2 — Architecture violation (controller → database)

### Context

A developer shortcuts a user profile endpoint by querying the database directly from the HTTP controller, bypassing the service and repository layers.

### Developer command

```bash
git checkout -b feature/fast-user-profile
# ... edit src/controllers/userController.ts ...
git add src/controllers/userController.ts
/smart-code-review-guardian:review-pr
```

Focused alternative:

```bash
/smart-code-review-guardian:review-architecture
```

### Fake git diff summary

```
diff --git a/src/controllers/userController.ts b/src/controllers/userController.ts
--- a/src/controllers/userController.ts
+++ b/src/controllers/userController.ts
@@ -1,8 +1,12 @@
+import { db } from '../database/client';
+
 export async function getUser(req, res) {
-  const user = await userService.findById(req.params.id);
+  const rows = await db.query(
+    'SELECT * FROM users WHERE id = $1',
+    [req.params.id]
+  );
+  const user = rows[0];
   res.json(user);
 }
```

| File | Change | Layers touched |
| --- | --- | --- |
| `src/controllers/userController.ts` | Modified | Controller → DB (skips service/repository) |

### What the plugin checks

| Step | Component | Action |
| --- | --- | --- |
| 1 | `collect-git-context.js` | Branch diff vs `main`; single file changed |
| 2 | `architecture-reviewer` | Reads `ARCHITECTURE.md` if present; otherwise infers layers from `controllers/`, `services/`, `database/` |
| 3 | `architecture-review-skill` | Flags direct `db.query` import in controller |
| 4 | Evidence rule | Cites exact import path and SQL call from diff — no invented rules without labelling inference |

### Example plugin output

```markdown
# Smart Code Review Guardian Report

Overall Status: WARN
Risk Score: 7

## Summary

The user controller now accesses the database directly, bypassing the existing
service layer. This introduces a layer violation that will complicate testing
and future schema changes.

## Changed Files Reviewed

| File | Change Type | Risk Level | Notes |
| --- | --- | --- | --- |
| src/controllers/userController.ts | modified | HIGH | Direct DB access added |

## Findings

### Finding 1
- **Severity:** HIGH
- **Category:** Architecture
- **File:** src/controllers/userController.ts
- **Evidence:** Adds `import { db } from '../database/client'` and calls
  `db.query('SELECT * FROM users ...')` inside `getUser` handler.
- **Why it matters:** HTTP layer should not own persistence logic; violates
  separation of concerns and bypasses `userService.findById`.
- **Suggested fix:** Restore service call or add `UserRepository.getById(id)`
  and invoke via `UserService`.

## Missing Context

- No ARCHITECTURE.md found — layer rules inferred from repository structure.

## Recommended Next Actions

- [ ] Move query to repository layer
- [ ] Add integration test at service/repository level if behaviour changed

## Final Decision

**WARN** — High-severity architecture violation; refactor before merge.
```

### Why this helps developer productivity

- Surfaces **structural debt** early, when the diff is still small.
- Gives file-level evidence the author can action immediately.
- Prevents repeated architecture discussions on every subsequent PR touching the same shortcut.

### Strict mode behaviour

| Layer | Behaviour |
| --- | --- |
| **Git hook** | No secret/eval pattern → **PASS** (architecture not in regex scope). |
| **`SMART_REVIEW_STRICT=true`** | Hook still **PASS**; architecture requires AI review. |
| **Recommended CI gate** | Fail PR check when plugin report contains **HIGH | Architecture** (custom parser on report or human policy). |

Architecture violations are best caught by `/review-pr` or `/review-architecture`, not lightweight hooks.

---

## Scenario 3 — Documentation gap + hardcoded secret

### Context

A developer adds a `--dry-run` CLI flag and wires a third-party API key inline in config. README is not updated.

### Developer command

```bash
git checkout -b feature/dry-run-export
# ... edit src/cli.ts and src/config.ts ...
git add src/cli.ts src/config.ts
/smart-code-review-guardian:review-pr
```

Focused alternatives:

```bash
/smart-code-review-guardian:check-docs
```

### Fake git diff summary

```
diff --git a/src/cli.ts b/src/cli.ts
--- a/src/cli.ts
+++ b/src/cli.ts
@@ -10,6 +10,7 @@ program
   .command('export')
+  .option('--dry-run', 'Simulate export without writing files')
   .action(runExport);

diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,4 @@
+export const EXPORT_API_KEY = 'sk-live-a8f3k2m9p1q7r4t6v2w0x5y8z';
 export const DEFAULT_TIMEOUT = 30_000;
```

| File | Change | User-visible? |
| --- | --- | --- |
| `src/cli.ts` | New `--dry-run` flag | Yes — CLI |
| `src/config.ts` | Hardcoded API key | Yes — security |
| `README.md` | Unchanged | Gap |

### What the plugin checks

| Step | Component | Action |
| --- | --- | --- |
| 1 | `documentation-reviewer` | Detects new CLI option; checks README / docs for `--dry-run` |
| 2 | `risk-reviewer` | Flags hardcoded `sk-live-...` pattern as **CRITICAL** |
| 3 | `REVIEW_POLICY.md` | Any **CRITICAL** finding → overall **FAIL** |
| 4 | Git hook (optional) | `pre-commit-review.sh` regex may catch API key pattern independently |

### Example plugin output

```markdown
# Smart Code Review Guardian Report

Overall Status: FAIL
Risk Score: 9

## Summary

This PR introduces a user-facing CLI flag without documentation updates and
commits a live-format API key to source control. The secret must be removed
before merge; documentation should describe the new flag.

## Changed Files Reviewed

| File | Change Type | Risk Level | Notes |
| --- | --- | --- | --- |
| src/cli.ts | modified | MEDIUM | New `--dry-run` option |
| src/config.ts | modified | CRITICAL | Hardcoded API key |

## Findings

### Finding 1
- **Severity:** CRITICAL
- **Category:** Security
- **File:** src/config.ts
- **Evidence:** `export const EXPORT_API_KEY = 'sk-live-a8f3k2m9p1q7r4t6v2w0x5y8z';`
- **Why it matters:** Secrets in version control can be exposed via repo access,
  forks, and logs; key rotation required if committed.
- **Suggested fix:** Remove key; load from `EXPORT_API_KEY` env var; rotate key;
  document in `.env.example`.

### Finding 2
- **Severity:** MEDIUM
- **Category:** Documentation
- **File:** README.md (not updated)
- **Evidence:** `src/cli.ts` adds `.option('--dry-run', ...)`; README CLI
  section has no mention of `--dry-run`.
- **Why it matters:** Users cannot discover simulation mode without reading source.
- **Suggested fix:** Add `--dry-run` to README with example:
  `myapp export --dry-run`.

## Missing Context

- Could not verify whether `.env.example` exists or lists `EXPORT_API_KEY`.

## Recommended Next Actions

- [ ] Remove hardcoded key; use environment variable
- [ ] Rotate compromised API key
- [ ] Update README CLI section
- [ ] Add secret scanning to CI

## Final Decision

**FAIL** — Critical secret in diff; do not merge until remediated.
```

### Why this helps developer productivity

- Blocks a **high-impact security incident** before code reaches shared history.
- Pairs security with **actionable doc fixes** in one review pass.
- Redacts and explains remediation (env vars, rotation) so the developer knows exactly what to do.

### Strict mode behaviour

| Layer | Behaviour |
| --- | --- |
| **Git hook** (default) | `pre-commit-review.sh` matches API key pattern → prints `FINDING [CRITICAL-secret]` → **WARN**, commit still allowed. |
| **`SMART_REVIEW_STRICT=true`** | Same finding → hook exits **1** → **commit blocked** until key removed. |
| **`pre-push-review.sh` strict** | Branch diff secret scan → **push blocked**. |
| **Plugin report** | **FAIL** regardless of hook mode — CRITICAL finding per REVIEW_POLICY.md. |

This scenario shows defence in depth: regex hooks catch obvious secrets fast; AI review catches doc gaps and provides structured remediation.

---

## Summary comparison

| Scenario | Command | Overall status | Primary finding | Hook (default) | Strict mode |
| --- | --- | --- | --- | --- | --- |
| Missing tests | `/review-pr` | WARN | HIGH — Tests | PASS | PASS (use AI review for gate) |
| Architecture violation | `/review-architecture` | WARN | HIGH — Architecture | PASS | PASS (use AI review for gate) |
| Doc gap + secret | `/review-pr` | FAIL | CRITICAL — Security | WARN | **Commit/push blocked** |

---

## How to reproduce the eval equivalents

These scenarios align with golden cases in `evals/golden-cases.json`:

```bash
npm run verify
```

| Golden case | Scenario |
| --- | --- |
| `missing-test` | Scenario 1 |
| `architecture-violation` | Scenario 2 |
| `documentation-gap` + `secret-detection` | Scenario 3 |

---

## Related documents

- [demo-walkthrough.md](demo-walkthrough.md) — Live 5-minute reviewer demo (load plugin, run evals)
- [sample-review-output.md](sample-review-output.md) — Combined multi-finding report example
- [../REVIEW_POLICY.md](../REVIEW_POLICY.md) — PASS/WARN/FAIL scoring rules
- [../hooks/README.md](../hooks/README.md) — Strict mode and git hook wiring
