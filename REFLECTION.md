# Reflection — Smart Code Review Guardian

## What would you improve with more time?

1. **Live LLM eval pipeline** — Run `/review-pr` against frozen diffs in CI and score outputs with an LLM-as-judge or human-labelled dataset.
2. **GitHub App integration** — Post structured review comments on PRs and sync PASS/WARN/FAIL to branch protection rules.
3. **Policy packs** — Allow teams to drop in `policy/architecture.yaml` instead of inferring layers from folders.
4. **Richer secret scanning** — Integrate gitleaks or trufflehog in hooks instead of regex-only checks.
5. **Cross-language test mapping** — Expand heuristics for Rust, Java, C#, etc. with language-specific skills.

## What trade-offs did you make?

| Trade-off | Choice | Rationale |
| --- | --- | --- |
| Eval depth vs speed | Keyword/category checks on sample outputs | Credible local harness without API keys or flaky LLM runs |
| Hook strictness | Warn by default | Developer-friendly; opt-in `SMART_REVIEW_STRICT` for CI |
| Architecture rules | Infer from structure when docs missing | Works out-of-box; clearly labelled as inference |
| MCP | Stub only | No external credentials required for challenge |
| Commands vs skills | Both | Commands for explicit UX; skills for model-invoked discovery |
| Manifest location | `.claude-plugin/plugin.json` | Claude Code standard vs user sketch of root `plugin.json` |

## What did you learn?

- **Context engineering** matters more than prompt length — bounded diff-first review reduces hallucination.
- **Structured output** (PASS/WARN/FAIL + evidence fields) makes AI review actionable in CI and human workflows.
- **False-positive guards** (docs-only changes) must be first-class eval cases, not afterthoughts.
- **Plugin composition** (commands + skills + agents + hooks + evals) demonstrates reusable harness thinking vs a single mega-prompt.
- Claude Code's namespacing and `${CLAUDE_PLUGIN_ROOT}` enable portable scripts across install methods.

## Who is the user of the plugin?

Primary: **developers** preparing changes for review who want fast, evidence-backed feedback before opening a PR.

Secondary: **DevEx/platform engineers** who ship consistent review standards to many repos via a plugin marketplace and strict hooks.

## What feedback would you collect post-release?

- Was the **Final Decision** (PASS/WARN/FAIL) correct vs human reviewer outcome?
- Which findings were **actionable** vs noise? (thumbs up/down per finding)
- Did any finding cite **non-existent files**? (hallucination rate)
- Time saved vs manual review (self-reported)
- Missing categories teams need (performance, accessibility, i18n)

## If three other teams adopted this tomorrow, what would need to change?

1. **Configurable policy** — Per-team REVIEW_POLICY overrides and severity thresholds
2. **Repo-specific skill extensions** — e.g. `smart-code-review-guardian-frontend` plugin depending on base
3. **Central eval registry** — Shared golden cases from each team's incident/postmortem history
4. **Auth for MCP** — Optional GitHub/GitLab tokens for PR metadata (never required for local mode)
5. **Onboarding docs** — 10-minute quickstart per stack (Node, Python, Go)

## How would you measure whether the plugin improves developer outcomes, not just usage?

| Metric | Outcome signal | Not sufficient alone |
| --- | --- | --- |
| Defect escape rate | Bugs found in prod that review should catch | — |
| Review cycle time | Time from PR open to merge | Usage count |
| Finding action rate | % of findings with follow-up commits | Command invocations |
| False positive rate | Findings dismissed by humans | — |
| Critical miss rate | CRITICAL issues human found but plugin missed | — |
| Developer satisfaction | Survey: "Review helped me ship safely" | Stars/downloads |

Usage metrics (invocations, installs) track adoption; **outcome metrics** track whether reviews actually reduce rework and incidents.
