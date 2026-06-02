# Hooks

Non-intrusive review gates for local git workflows and Claude Code sessions.

## Design principles

| Principle | Implementation |
| --- | --- |
| **Non-blocking by default** | Scripts exit 0 unless `SMART_REVIEW_STRICT=true` |
| **Lightweight** | Regex heuristics only — not a substitute for `/review-pr` |
| **Opt-in strictness** | CI sets `SMART_REVIEW_STRICT=true` to fail on HIGH/CRITICAL patterns |
| **No auto-fix** | Warn and suggest `/smart-code-review-guardian:review-pr` for full AI review |

## Files

| File | Purpose |
| --- | --- |
| `hooks.json` | Claude Code plugin hook — prints one-line SessionStart banner (non-blocking) |
| `pre-commit-review.sh` | Git pre-commit helper — scans **staged** diff for secrets and risky patterns |
| `pre-push-review.sh` | Git pre-push helper — scans branch diff for skipped tests and secrets |

## Claude Code hook (`hooks.json`)

On session start, runs `scripts/session-banner.js` (cross-platform Node). It prints a reminder only and **never blocks** the session.

## Git hook installation (optional)

Wire the shell scripts into your repository's git hooks:

```bash
# From your target repository (not the plugin directory)
PLUGIN_ROOT="/path/to/smart-code-review-guardian"

ln -sf "$PLUGIN_ROOT/hooks/pre-commit-review.sh" .git/hooks/pre-commit
ln -sf "$PLUGIN_ROOT/hooks/pre-push-review.sh" .git/hooks/pre-push
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

Or call from an existing hook:

```bash
export CLAUDE_PLUGIN_ROOT="/path/to/smart-code-review-guardian"
bash "$CLAUDE_PLUGIN_ROOT/hooks/pre-commit-review.sh"
```

### Strict mode (CI / protected branches)

```bash
export SMART_REVIEW_STRICT=true
bash hooks/pre-commit-review.sh   # exits 1 on CRITICAL/HIGH pattern matches
```

### Windows

Use Git Bash or WSL to run `.sh` scripts. The Claude Code `hooks.json` entry uses Node and works on all platforms.

## What hooks check

**Pre-commit (staged diff):**

- Hardcoded API key patterns (CRITICAL)
- Hardcoded passwords (HIGH)
- `eval(` usage (HIGH)
- Empty catch blocks (MEDIUM)

**Pre-push (branch diff):**

- Skipped/focused tests (`it.skip`, `@pytest.mark.skip`, etc.)
- Hardcoded API key patterns (CRITICAL)

## Related

- Full review: `/smart-code-review-guardian:review-pr`
- Policy: [../REVIEW_POLICY.md](../REVIEW_POLICY.md)
