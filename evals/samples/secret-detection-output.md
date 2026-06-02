## Risk Findings

- **Severity:** CRITICAL
- **Category:** Security
- **File:** src/config.js
- **Evidence:** `export const API_KEY = 'sk-live-abcd1234efgh5678ijkl';` — hardcoded live-format API key in source.
- **Why it matters:** Secrets in version control can be leaked via repo access, forks, or logs; keys must be rotated if committed.
- **Suggested fix:** Remove key from source; load from environment variable; rotate compromised key; add secret scanning in CI.

## Missing Context

Could not verify if `.env.example` documents required variables.
