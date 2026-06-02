# Smart Code Review Guardian Report

Overall Status: WARN
Risk Score: 6

## Summary

This change adds a discount calculation utility and updates the user controller to fetch profiles directly from the database. Test coverage is missing for new pricing logic, and the controller change introduces a layer violation. No secrets detected. Documentation was not in scope for this diff.

## Changed Files Reviewed

| File | Change Type | Risk Level | Notes |
| --- | --- | --- | --- |
| src/utils/pricing.js | modified | MEDIUM | New exported function |
| src/controllers/userController.js | modified | HIGH | Direct DB access added |
| README.md | modified | LOW | Typo fix only |

## Findings

### Finding 1
- **Severity:** HIGH
- **Category:** Tests
- **File:** src/utils/pricing.js
- **Evidence:** New `calculateDiscount(amount, tier)` with branching logic; no updates to `src/utils/pricing.test.js`.
- **Why it matters:** Billing-related logic without tests risks incorrect charges.
- **Suggested fix:** Add unit tests for negative amounts, gold tier, and default tier.

### Finding 2
- **Severity:** HIGH
- **Category:** Architecture
- **File:** src/controllers/userController.js
- **Evidence:** `const db = require('../database/client')` and `db.query` inside controller handler.
- **Why it matters:** Skips service/repository layer; harder to test and maintain.
- **Suggested fix:** Move query to `UserRepository`; expose via `UserService`.

### Finding 3
- **Severity:** LOW
- **Category:** Maintainability
- **File:** src/utils/pricing.js
- **Evidence:** Magic numbers `0.2` and `0.1` for discount rates.
- **Why it matters:** Unclear business rules when rates change.
- **Suggested fix:** Extract named constants `GOLD_DISCOUNT_RATE`, `DEFAULT_DISCOUNT_RATE`.

## Missing Context

- CI test results not available — could not verify whether existing suite passes.
- No ARCHITECTURE.md found — layer violation inferred from directory structure.

## Recommended Next Actions

- [ ] Add `pricing.test.js` covering tier and validation branches
- [ ] Refactor user controller to use repository pattern
- [ ] Extract discount rate constants
- [ ] Run full test suite locally before merge

## Final Decision

**WARN** — High-severity test and architecture gaps should be addressed before merge, but no critical security blockers found.
