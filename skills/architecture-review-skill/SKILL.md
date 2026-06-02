---
name: architecture-review-skill
description: Reviews changed code for layer violations, circular dependencies, and pattern consistency. Use when analysing imports, module structure, or architecture compliance.
---

# Architecture Review Skill

Detect architecture risks in **changed code only**. Pair with `agents/architecture-reviewer.md` for deep dives.

## Preconditions

1. Obtain changed file list and diff (via `collect-git-context.js` or git).
2. Search for explicit rules:
   - `ARCHITECTURE.md`
   - `docs/architecture/`
   - ADR files (`docs/adr/`, `ADR-*.md`)
   - CONTRIBUTING sections on layering

If none exist, **infer cautiously** from folder layout and state: *"Inferred from repository structure — no explicit ARCHITECTURE.md found."*

## Common violation patterns

| Pattern | Example signal | Typical severity |
| --- | --- | --- |
| Layer skip | Controller/route imports DB client directly | HIGH |
| Logic in UI | React component with business rules / SQL | HIGH |
| Circular import | A → B → A in new imports | MEDIUM–HIGH |
| Pattern bypass | Raw HTTP in service that should use existing client | MEDIUM |
| God module | New catch-all util importing across layers | MEDIUM |

Adapt patterns to stack (Express, Django, Spring, etc.) — describe violation in stack-neutral terms with file evidence.

## Analysis steps

1. **Group changed files by layer** (infer from path: `controllers/`, `api/`, `services/`, `domain/`, `infra/`, `ui/`).
2. **Inspect new imports** in diff — flag cross-layer imports violating documented or inferred rules.
3. **Check new dependencies** in manifest files if dependency graph changes.
4. **Circular deps** — trace import chain only among changed + directly imported files.

## Evidence format

Each finding must include:

```
File: src/api/users.ts
Evidence: Line 12 adds `import { db } from '../database/client'` — route handler queries DB directly.
Why: Violates layered architecture (API → Service → Repository).
Suggested fix: Move query to UserRepository; inject into UserService; call from controller.
```

## When not to flag

- Test files mirroring production structure for integration tests
- Documented exceptions in ARCHITECTURE.md
- Changes that only touch allowed layers

## Output

Return architecture findings for merge into main report. Empty list is valid — say "No architecture violations found in changed files."

## Guardrails

- No violation without file + import/evidence
- Do not read entire dependency graph
- Label all inferred rules clearly
