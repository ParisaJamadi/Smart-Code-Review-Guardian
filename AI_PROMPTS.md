# AI Prompts Log — Building Smart Code Review Guardian

Realistic log of AI-assisted design sessions used to build this plugin. Each entry includes the prompt, model suggestions, human decisions, and how output was validated.

---

## Session 1 — Initial design (2026-05-30)

**Human:**

> Build a Claude Code plugin called `smart-code-review-guardian` for PR/local diff review. Must include commands, skills, subagents, hooks, and evals — not a one-off script. Detect missing tests, architecture violations, doc gaps, security risks, AI code smells. Structured PASS/WARN/FAIL reports. Strong context engineering and eval discipline.

**AI:**

Proposed directory layout with `.claude-plugin/plugin.json`, separate orchestrator skill vs four specialised reviewers, git diff priority (staged → working → branch), and a `Missing Context` report section to reduce hallucination.

**Human decision:** Accepted layout. Rejected single mega-prompt approach. Asked for five eval golden cases including a docs-only false-positive guard.

**Validation:** Compared structure to [Claude Code plugin docs](https://code.claude.com/docs/en/plugins). Confirmed components must live at plugin root, not inside `.claude-plugin/`.

---

## Session 2 — Command design

**Human:**

> Write `/review-pr`, `/review-architecture`, `/check-tests`, `/check-docs`, `/run-review-evals`. Reference REVIEW_POLICY.md, use collect-git-context.js, invoke subagents, enforce exact markdown report structure.

**AI:**

Suggested `disable-model-invocation: true` on commands, `$ARGUMENTS` for focus scopes, parallel Task/subagent invocation in review-pr, optional validate step via script.

**Human decision:** Accepted all. Added `${CLAUDE_PLUGIN_ROOT}` for portable script paths.

**Validation:**

```bash
node scripts/validate-review-output.js examples/sample-review-output.md
# → valid: true
```

---

## Session 3 — Subagent design

**Human:**

> Four subagents with success/failure criteria. Architecture must not invent rules. Test reviewer must not flag docs-only changes. Risk reviewer covers AI slop patterns.

**AI:**

Linked each agent to a skill via frontmatter. Set `disallowedTools: Write, Edit`. Added AI smell checklist (empty catch, fake imports, vague TODOs).

**Human pushback:** "Agents were referencing `agents/foo.md` as invocation target — fix to agent names."

**Fix applied:** Commands now say `invoke the test-reviewer subagent (see agents/test-reviewer.md)`.

**Validation:** Mapped each agent to `evals/golden-cases.json` case ID.

---

## Session 4 — Eval harness

**Human:**

> Lightweight evals: missing test, architecture violation, doc gap, false-positive guard, secret detection. JSON rules + sample outputs. `--strict` for CI.

**AI:**

Split `golden-cases.json` (inputs) from `expected-results.json` (rules). Sample markdown in `evals/samples/` as LLM stand-ins.

**Human decision:** Accepted keyword/category checks over live LLM eval for reproducibility without API keys.

**Validation:**

```bash
node evals/run-evals.js
# Total: 5 | Passed: 5 | Failed: 0
```

False-positive case uses `mustNotIncludeKeywords: ["missing test"]`.

---

## Session 5 — Hooks (iteration)

**Human:**

> Pre-commit and pre-push bash hooks. Non-blocking unless SMART_REVIEW_STRICT=true.

**AI (v1):** Wired pre-commit script to Claude Code `PreToolUse` on every Bash call.

**Human pushback:** "Too intrusive — blocks developer flow."

**AI (v2):** SessionStart one-line banner via cross-platform `scripts/session-banner.js`. Git hooks remain optional `.git/hooks` wiring documented in `hooks/README.md`.

**Validation:** Hook prints one line only; never exits non-zero from SessionStart.

---

## Session 6 — README and submission polish

**Human:**

> README for hiring panel: problem, install, architecture, eval, limitations, scaling. Remove placeholder URLs. Add submission checklist.

**AI:**

Added Mermaid diagram, component table, `SUBMISSION_CHECKLIST.md`, `commands/README.md`, `LICENSE`, `package.json` with `npm run verify`.

**Human decision:** Removed `homepage`/`repository` placeholder URLs from manifest. Documented `.claude-plugin/` vs root `plugin.json` assumption.

**Validation:** Read-through target <10 minutes. All linked paths verified to exist.

---

## Session 7 — Submission review fixes

**Human:**

> Review against challenge requirements. Fix placeholders, broken paths, vague sections. Submission-ready.

**AI findings:**

| Issue | Fix |
| --- | --- |
| `github.com/example` in manifest | Removed |
| Broken diff-source line in pre-commit hook | Fixed stdin parsing |
| Windows-incompatible `/dev/null` in hooks.json | Replaced with Node banner script |
| Agent path references in commands | Corrected to subagent names |
| evals exit code always 0 on failure | Exit 1 when any case fails |
| Missing LICENSE | Added MIT LICENSE file |

**Validation:** `npm run verify` — evals + sample report validation.

---

## How AI suggestions were validated

| Area | Method |
| --- | --- |
| Plugin structure | Claude Code official docs + `SUBMISSION_CHECKLIST.md` |
| Report format | `validate-review-output.js` on sample report |
| Eval cases | `run-evals.js` — 5/5 pass |
| Hallucination guardrails | Manual audit of skill/agent "never assume" rules |
| False-positive guard | Dedicated eval case with forbidden keywords |
| Path portability | `${CLAUDE_PLUGIN_ROOT}` in commands/hooks |
| No placeholder content | Grep for `<this-repo>`, `example.com`, empty sections |

## Prompts intentionally rejected

- **"Review the entire repository"** — conflicts with bounded context design
- **"Auto-fix all findings"** — out of scope; review-only plugin
- **"Install npm packages for analysis"** — violates guardrails in REVIEW_POLICY.md
- **"Hook every shell command"** — replaced with non-intrusive SessionStart banner

## Iteration summary

| Version | Change |
| --- | --- |
| v0.1 | Initial scaffold |
| v0.2 | Moved manifest to `.claude-plugin/plugin.json` |
| v0.3 | Added eval false-positive guard |
| v1.0 | Submission polish: docs, LICENSE, verify script, hook fix |
