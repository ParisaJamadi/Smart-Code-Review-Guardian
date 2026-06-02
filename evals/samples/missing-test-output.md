## Test Review Findings

- **Severity:** HIGH
- **Category:** Tests
- **File:** src/utils/pricing.js
- **Evidence:** New exported function `calculateDiscount` added with validation and tier logic; no corresponding change in `src/utils/pricing.test.js` or `tests/pricing.test.js`.
- **Why it matters:** Discount logic affects billing; untested negative amount and tier branches risk production bugs.
- **Suggested fix:** Add `pricing.test.js` with cases for negative amount, gold tier 20%, default tier 10%.

**Missing Context:** Test framework not confirmed — Jest assumed from repo structure.
