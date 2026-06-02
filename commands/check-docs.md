---
description: Verify documentation is updated when public API, CLI, config, or behaviour changes. Flags README and docs gaps.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Shell, Task
---

# /check-docs

Run a documentation-focused review on current git changes.

## Steps

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"`.
2. Detect changes to public APIs, CLI flags, env vars, config schema, or user-visible behaviour.
3. Follow `skills/documentation-review-skill/SKILL.md` and/or invoke the `documentation-reviewer` subagent (see `agents/documentation-reviewer.md`).
4. List exact docs files that should be updated with suggested content outlines.
5. Output standard report sections relevant to **Documentation** findings.

User focus (optional): `$ARGUMENTS`
