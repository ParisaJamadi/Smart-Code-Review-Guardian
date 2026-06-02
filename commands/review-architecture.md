---
description: Review changed code for architecture violations, layer boundaries, and pattern consistency. Uses local ARCHITECTURE.md when available.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Shell, Task
---

# /review-architecture

Run an architecture-focused review on current git changes.

## Steps

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"` to get changed files and diff.
2. Read `ARCHITECTURE.md`, `docs/architecture/`, or similar **only if they exist**.
3. Follow `skills/architecture-review-skill/SKILL.md` and/or invoke the `architecture-reviewer` subagent (see `agents/architecture-reviewer.md`).
4. Output findings in the standard report format from REVIEW_POLICY.md (Architecture category only, plus Missing Context).
5. Include **Overall Status** and **Risk Score** based on architecture findings only.

## Guardrails

- Never invent architecture rules without citing repo docs or clearly labelling inference.
- Every violation must cite file path and evidence.

User focus (optional): `$ARGUMENTS`
