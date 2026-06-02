## Documentation Findings

- **Severity:** MEDIUM
- **Category:** Documentation
- **File:** README.md (not updated)
- **Evidence:** `src/cli.js` adds `--dry-run` option; README CLI section has no mention of `--dry-run`.
- **Why it matters:** Users cannot discover simulation mode without reading source.
- **Suggested fix:** Add `--dry-run` to README CLI options with description and example: `mycli deploy --dry-run`.

## Missing Context

Could not verify if `docs/cli.md` exists — recommend checking docs folder.
