#!/usr/bin/env node
/**
 * Cross-platform SessionStart banner for Claude Code plugin hook.
 * Non-blocking: prints a single line reminder. Never fails the session.
 */

process.stdout.write(
  '[Smart Code Review Guardian] Active. Run /smart-code-review-guardian:review-pr to review changes.\n'
);
process.exit(0);
