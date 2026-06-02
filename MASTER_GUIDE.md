# MASTER_GUIDE.md

**Internal engineering guide for the creator of Smart Code Review Guardian**

This document is not user-facing documentation. It exists so you—the person who built (or inherited) this plugin—can understand, explain, demo, maintain, extend, and defend the project in technical interviews.

Read this guide once end-to-end, then use Section 20 (Cheat Sheet) before interviews.

---

# 1. Executive Summary

## What problem this plugin solves

Every day, developers open Pull Requests (PRs) with code that is *almost* ready to merge. The diff might be missing tests, violate team architecture, skip documentation updates, or contain a hardcoded secret pasted from an AI chat window. Human reviewers catch these issues—but inconsistently, slowly, and often after the author has already context-switched to another task.

**Smart Code Review Guardian** is a Claude Code plugin that runs a structured, evidence-backed code review on local git changes *before* they reach a human reviewer or CI. It produces a predictable report with **PASS / WARN / FAIL**, a risk score, and actionable findings.

Think of it as a **reusable review harness**, not a single prompt you paste into chat.

## Why the problem matters

Code review is one of the last quality gates before production. When it fails:

- Bugs reach customers (missing tests on billing logic → incorrect charges).
- Architecture erodes (controller talks to DB directly → untestable monolith).
- Secrets leak (API key committed → incident response, rotation, audit).
- Docs drift (new CLI flag undocumented → support tickets).

These are not rare edge cases. They are the *default failure modes* of fast-moving teams, especially teams using AI coding assistants that generate plausible but incomplete changes.

## Why developers need it

Developers need **fast, consistent feedback** that:

1. Runs on *their* diff, in *their* repo, before opening a PR.
2. Does not hallucinate files or claim tests exist when they do not.
3. Outputs something they can act on in 10 minutes—not a wall of generic advice.

## Why AI is a good fit

Code review is judgment over structured evidence: "this import crosses a layer boundary," "this function changed but no test file changed," "this string looks like a live API key." That maps well to LLMs **when**:

- Context is bounded (diff + a few related files, not the whole monorepo).
- Output is structured (severity, category, evidence, suggested fix).
- Uncertainty is explicit (`Missing Context` instead of guessing).

AI is a poor fit for *replacing* human review entirely. It is a strong fit for **first-pass, always-on review** that catches obvious gaps and frees humans for higher-order design discussion.

## What makes this different from a simple code review tool

| Simple approach | This plugin |
| --- | --- |
| One mega-prompt in ChatGPT | Composable commands, skills, subagents, hooks, evals |
| Reviews "the codebase" vaguely | Diff-first; changed files only |
| Unstructured paragraphs | Fixed report schema + validation script |
| No way to test if review quality regressed | Golden-case eval harness (`npm run verify`) |
| Same rules for every repo | Reads local `ARCHITECTURE.md`, README, test layout when present |
| Blocks or annoys developers by default | Hooks warn by default; strict mode opt-in |

**Real-world example:** A developer adds `calculateDiscount()` in `src/billing/discount.ts` without tests. A linter will not care. A generic AI chat might say "consider adding tests." This plugin's **test-reviewer** maps `discount.ts` → expected test paths, states **HIGH** severity with evidence, and suggests concrete cases (negative amount, gold tier, standard tier). That is the difference between *awareness* and *action*.

---

# 2. Understanding the Problem

## How Pull Requests work

A **Pull Request** is a request to merge a branch of code into a shared branch (usually `main`). It bundles:

- A **diff** (what lines changed).
- A **description** (what the author intended).
- A **review workflow** (teammates comment, approve, or request changes).

```
feature branch ──PR──> main branch
     │                    │
     └── commits ─────────┘
```

The PR is the social and technical unit of code integration in most teams.

## What a PR is (in practice)

A PR is not just git mechanics. It is:

- A **proposal** ("this change is safe to merge").
- A **conversation** (questions, suggestions, approvals).
- A **trigger** for CI (tests, lint, security scans).

## How code reviews happen today

Typical flow:

1. Developer pushes branch, opens PR.
2. CI runs automated checks (tests, lint, SAST).
3. Human reviewer reads diff (often partially, under time pressure).
4. Reviewer leaves comments; author pushes fixes.
5. Reviewer approves; PR merges.

Bottlenecks: reviewer availability, inconsistency between reviewers, fatigue on large or AI-generated diffs.

## Typical developer pain points

### Missing tests

**Example:** Auth middleware change without updating `test_auth.py`. CI might still pass if tests were never written. Production breaks when edge case hits.

### Architecture violations

**Example:** `UserController` imports `database.client` and runs SQL. Works locally. Six months later, every controller duplicates queries and unit tests require a real DB.

### Missing documentation

**Example:** New env var `REDIS_URL` added to config loader. README unchanged. Next developer spends an hour debugging startup failures.

### Risky AI-generated code

**Example:** Copilot adds `try/except: pass`, imports from `utils.helpers` that does not exist, or leaves `// TODO: fix later` in payment code. Code compiles; behaviour is wrong.

### Security issues

**Example:** `API_KEY = "sk-live-..."` committed in a config file. Git history retains it forever unless scrubbed.

### Reviewer fatigue

**Example:** 800-line AI-generated PR on Friday afternoon. Reviewer skims, approves, misses the secret in line 642.

---

# 3. Product Thinking

## Why would a company pay for this?

Companies pay for tools that reduce **cost of poor quality** and **cost of slow delivery**:

- Fewer production incidents (security, billing bugs).
- Less senior engineer time spent on repetitive review comments.
- Faster time-to-merge for junior developers who get guided feedback early.

This plugin is framed as **infrastructure for AI-native engineering**—the kind of reusable harness platform teams need when rolling out Claude Code or similar tools at scale.

## Business value

| Value | Mechanism |
| --- | --- |
| Faster reviews | Author fixes issues before opening PR |
| Fewer bugs | Test/architecture/security gaps flagged early |
| Better DX | Structured PASS/WARN/FAIL, not vague chat |
| Consistent standards | Same REVIEW_POLICY.md for every repo using the plugin |
| Auditability | Report schema + eval harness prove behaviour over time |

## Who are the users?

1. **Individual developer** — runs `/review-pr` before `git push`.
2. **Tech lead** — defines policy, distributes plugin via marketplace.
3. **DevEx / Platform engineer** — wires hooks + CI strict mode.
4. **Security / compliance** — cares about secret detection and evidence fields.

## What metrics would improve?

**Outcome metrics (what you want):**

- Defect escape rate (bugs in prod that review should have caught).
- Time from PR open to merge.
- % of review findings that lead to a fix commit.
- False positive rate (findings dismissed by humans).

**Not sufficient alone:** command invocation count, plugin installs.

---

# 4. High-Level Architecture

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPER                                 │
│  git add / commit / branch                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              /smart-code-review-guardian:review-pr               │
│              (command in commands/review-pr.md)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLAUDE CODE + PLUGIN                         │
│  ┌──────────────────┐    ┌─────────────────────────────────┐  │
│  │ collect-git-     │    │ code-review-skill (orchestrator) │  │
│  │ context.js       │───>│ REVIEW_POLICY.md                 │  │
│  └──────────────────┘    └───────────────┬─────────────────┘  │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
   ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
   │ architecture-    │      │ test-reviewer    │      │ documentation-   │
   │ reviewer         │      │                  │      │ reviewer         │
   └────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
              │                            │                            │
              └────────────────────────────┼────────────────────────────┘
                                           │
                                           ▼
                              ┌──────────────────┐
                              │  risk-reviewer   │
                              └────────┬─────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              STRUCTURED REVIEW REPORT                            │
│  PASS/WARN/FAIL · Risk 1-10 · Findings · Missing Context         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  validate-review-output.js (optional) · hooks (optional)         │
│  evals/run-evals.js (harness regression tests)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Explain every box

| Box | What it is |
| --- | --- |
| **Developer** | Person with local git changes. Plugin reviews *their* working tree, staged files, or branch vs main. |
| **`/review-pr`** | Slash command—explicit user invocation. Instructions live in `commands/review-pr.md`. |
| **Claude Code + Plugin** | Anthropic's agentic IDE CLI loads plugin components from disk via `--plugin-dir` or marketplace install. |
| **collect-git-context.js** | Deterministic Node script. Runs git commands, outputs JSON. Reduces LLM git errors. |
| **code-review-skill** | Reusable workflow: how to gather context, call sub-workflows, format output. |
| **REVIEW_POLICY.md** | Scoring rubric: severity, PASS/WARN/FAIL rules. Single source of truth for decisions. |
| **Subagents (×4)** | Specialised reviewers with narrow prompts and `disallowedTools: Write, Edit`. |
| **Review Report** | Fixed markdown schema. Enables validation, CI parsing, consistent UX. |
| **validate-review-output.js** | Checks report has required sections. |
| **Hooks** | Optional fast regex gates (secrets, skipped tests). Not full AI review. |
| **Evals** | Regression tests on sample reviewer outputs—not live LLM calls. |

## Parallel vs serial execution

In `/review-pr`, subagents *should* run in parallel (via Task tool) when changes warrant multiple perspectives. The orchestrator merges and deduplicates findings. Focused commands (`/check-tests`) invoke one workflow only.

---

# 5. Repository Walkthrough

## Top-level map

```
smart-code-review-guardian/
├── .claude-plugin/          # Manifest only
├── agents/                  # Subagent definitions
├── commands/                # Slash commands
├── skills/                  # Reusable AI workflows
├── hooks/                   # Git + Claude Code hooks
├── scripts/                 # Deterministic helpers
├── evals/                   # Evaluation harness
├── mcp/                     # MCP stub server
├── examples/                # Sample outputs + demos
├── REVIEW_POLICY.md         # Scoring policy
├── README.md                # User-facing docs
├── REFLECTION.md            # Challenge reflection
├── AI_PROMPTS.md            # Build log
├── SUBMISSION_CHECKLIST.md  # Requirement mapping
├── MASTER_GUIDE.md          # This file
├── package.json             # npm run verify
└── LICENSE
```

## `.claude-plugin/`

| File | Purpose |
| --- | --- |
| `plugin.json` | Identity + component paths. Claude Code reads this at load time. |
| `README.md` | Explains why manifest is here, not at repo root. |

**Interaction:** Everything else is discovered *from* paths declared here.

## `agents/` (4 files + README)

Markdown files with YAML frontmatter defining subagents Claude can spawn.

| File | Agent name |
| --- | --- |
| `architecture-reviewer.md` | architecture-reviewer |
| `test-reviewer.md` | test-reviewer |
| `documentation-reviewer.md` | documentation-reviewer |
| `risk-reviewer.md` | risk-reviewer |

Each links to a skill via `skills:` frontmatter. **Interaction:** Commands tell Claude to invoke these via Task tool; skills provide reusable instructions.

## `commands/` (5 files + README)

Flat `.md` files = slash commands. Frontmatter includes `description`, `disable-model-invocation: true`, `allowed-tools`.

**Interaction:** Commands call scripts, reference skills/agents, define output template.

## `skills/` (4 directories + README)

Each skill is `skill-name/SKILL.md` with frontmatter `name` and `description`.

**Interaction:** Loaded by Claude automatically when relevant; referenced explicitly by commands and agents.

## `hooks/`

| File | Role |
| --- | --- |
| `hooks.json` | Claude Code SessionStart → `session-banner.js` (one-line reminder) |
| `pre-commit-review.sh` | Optional git hook: regex scan staged diff |
| `pre-push-review.sh` | Optional git hook: branch diff scan |
| `README.md` | Installation + strict mode docs |

**Interaction:** Independent of AI review; defence in depth for secrets.

## `scripts/`

| File | Role |
| --- | --- |
| `collect-git-context.js` | Git → JSON |
| `validate-review-output.js` | Report structure linter |
| `session-banner.js` | Cross-platform hook message |

**Interaction:** Called from commands (via Shell tool) and hooks.

## `evals/`

| File | Role |
| --- | --- |
| `golden-cases.json` | Scenario definitions |
| `expected-results.json` | Pass/fail rules |
| `samples/*.md` | Reference reviewer outputs |
| `run-evals.js` | Test runner |
| `README.md` | Eval docs |

**Interaction:** Validates that sample outputs still match policy; does not call Claude.

## `mcp/`

| File | Role |
| --- | --- |
| `review-context-stub.js` | Stdio MCP server returning stub JSON |

**Interaction:** Optional future GitHub/CI integration; no credentials today.

## `examples/`

| File | Role |
| --- | --- |
| `sample-review-output.md` | Full multi-finding report example |
| `demo-walkthrough.md` | Live demo script (5 min) |
| `scenario-demo-walkthrough.md` | Three PR scenarios for submission |

## Root policy and meta docs

| File | Audience |
| --- | --- |
| `REVIEW_POLICY.md` | Claude + humans (scoring) |
| `README.md` | Users / reviewers |
| `REFLECTION.md` | Challenge evaluators |
| `AI_PROMPTS.md` | Shows how plugin was built |
| `SUBMISSION_CHECKLIST.md` | Pre-submit verification |

## `package.json`

```json
"scripts": {
  "verify": "npm run evals:strict && npm run validate:sample"
}
```

Run before interviews: `npm run verify`.

---

# 6. Plugin Manifest Deep Dive

**Path:** `.claude-plugin/plugin.json`

Claude Code requires the manifest here—not at repository root. See official docs: https://code.claude.com/docs/en/plugins

## Field-by-field

| Field | Value | What Claude Code uses it for |
| --- | --- | --- |
| `name` | `smart-code-review-guardian` | **Namespace** for commands/skills: `/smart-code-review-guardian:review-pr` |
| `displayName` | Human-readable title in plugin manager UI | |
| `version` | `1.0.0` | Semver for updates; marketplace pinning |
| `description` | One-line summary | Shown when browsing/installing plugins |
| `author` | `{ name: ... }` | Attribution |
| `license` | `MIT` | Legal/spdx for distribution |
| `keywords` | Array of strings | Discovery/search |
| `commands` | `"./commands"` | Directory of slash command `.md` files |
| `agents` | `"./agents"` | Subagent definition files |
| `skills` | `"./skills"` | Skill directories with SKILL.md |
| `hooks` | `"./hooks/hooks.json"` | Event handlers |
| `mcpServers` | `"./.mcp.json"` | MCP server config path |

## Why each path field matters

Without explicit paths, Claude Code still auto-discovers default directories—but declaring them documents intent and supports custom layouts.

## `${CLAUDE_PLUGIN_ROOT}`

When the plugin is loaded, Claude Code sets this env var to the plugin directory. Commands and hooks use it so scripts work regardless of install location:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"
```

## What we intentionally omitted

- `homepage` / `repository` — removed placeholder URLs for submission credibility.
- `settings.json` — not needed; no default agent override.

---

# 7. Commands Deep Dive

Commands live in `commands/*.md`. Invoked as `/smart-code-review-guardian:<filename-without-md>`.

## `/review-pr`

**Purpose:** Full structured review.

**Internal flow:**

1. Shell: `collect-git-context.js` → JSON with diff, changedFiles, diffSource.
2. Read changed files + bounded context (README, ARCHITECTURE, tests).
3. Categorise each file by risk (REVIEW_POLICY.md).
4. Task tool → parallel subagents (architecture, test, doc, risk) as warranted.
5. Merge findings → output fixed markdown template.
6. Optional: `validate-review-output.js`.

**Input:** Optional `$ARGUMENTS` (e.g. "security only").

**Output:** Full Smart Code Review Guardian Report.

**Example:**

```
/smart-code-review-guardian:review-pr
/smart-code-review-guardian:review-pr focus on auth module
```

**Failure cases:**

| Situation | Behaviour |
| --- | --- |
| Not a git repo | Collector exits 1; command says run git init or cd to repo |
| No changes | Collector exits 2; report "no changes to review" |
| Subagents unavailable | Fall back to skills directly per command instructions |
| Missing ARCHITECTURE.md | Architecture reviewer infers layers, labels inference |

## `/review-architecture`

**Purpose:** Architecture findings only.

**Internal flow:** Collector → read ARCHITECTURE.md if exists → architecture-reviewer or architecture-review-skill → partial report with Overall Status + Architecture findings.

**Output:** Subset of full report (architecture category + Missing Context).

**Failure cases:** Same git issues; may output PASS if no production code changed.

## `/check-tests`

**Purpose:** Test coverage gaps only.

**Internal flow:** Collector → map source to test files via Glob → test-reviewer.

**Critical rule:** Docs-only changes → PASS, no missing-test warning (eval `false-positive-guard`).

**Failure cases:** Unknown test convention → Missing Context, not fabricated test paths.

## `/check-docs`

**Purpose:** Documentation sync gaps.

**Internal flow:** Detect user-visible changes (CLI, env, API) → documentation-reviewer → list exact doc files to update.

## `/run-review-evals`

**Purpose:** Run harness, not AI.

**Internal flow:** Shell: `node evals/run-evals.js` → print summary.

**Output:** JSON + human-readable pass/fail per case.

**Failure cases:** Missing sample file → case fails; script exits 1.

---

# 8. Skills Deep Dive

## What is a Claude Skill?

A **skill** is a markdown file (`SKILL.md`) with YAML frontmatter that teaches Claude *when* and *how* to perform a specialised workflow. Skills can be:

- **User-invoked** via namespaced command.
- **Model-invoked** when task matches `description`.
- **Attached to subagents** via agent frontmatter.

Skills are the plugin's **reusable procedure library**—like runbooks for an AI operator.

## Why skills were used

| Reason | Explanation |
| --- | --- |
| Reuse | Same test-review logic in `/check-tests` and test-reviewer agent |
| Maintainability | Change guardrails once in SKILL.md, not in five prompts |
| Discoverability | Claude can auto-apply code-review-skill when user says "review my PR" |
| Challenge requirement | Demonstrates composable harness, not one script |

## The four skills

| Skill | Orchestrator? | Focus |
| --- | --- | --- |
| `code-review-skill` | Yes | Full workflow, calls others |
| `architecture-review-skill` | No | Layer violations, imports |
| `test-review-skill` | No | Coverage mapping, false-positive guard |
| `documentation-review-skill` | No | README/API/CLI sync |

## How skills interact

```
code-review-skill
    ├── architecture-review-skill (when production code changes)
    ├── test-review-skill (when logic changes)
    ├── documentation-review-skill (when public surface changes)
    └── risk-reviewer agent / risk checks (always for code)
```

## How guardrails work in skills

Repeated across all skills:

- Never assume file exists without Glob/Read.
- Never claim test exists unless found.
- Prefer Missing Context over guessing.
- No destructive git commands.
- No auto package install.

These guardrails exist because **the main failure mode of AI code review is confident hallucination**.

## Why reusable workflows matter for interviews

Say this: *"We separated orchestration from specialised review procedures so teams can fork one skill—say, architecture—without copying the entire review prompt. That's how you scale AI tooling across repos without prompt spaghetti."*

---

# 9. Subagents Deep Dive

Subagents are defined in `agents/*.md`. Claude spawns them via the Task tool with focused context.

## Shared properties (all four)

```yaml
disallowedTools: Write, Edit
maxTurns: 12-15
model: sonnet
```

**Why no Write/Edit:** Review-only. Prevents agent from "fixing" code and hiding issues from the report.

## Architecture Reviewer

| Aspect | Detail |
| --- | --- |
| **Responsibilities** | Layer violations, DB-from-controller, circular imports, pattern bypass |
| **Inputs** | Changed files, diff, optional ARCHITECTURE.md |
| **Outputs** | Markdown findings list (not full report) |
| **Success** | Real violations with file + import evidence |
| **Failure** | Vague advice, invented rules, irrelevant file reads |

**Example finding:** Controller imports `../database/client` and calls `db.query`—HIGH Architecture.

## Test Reviewer

| Aspect | Detail |
| --- | --- |
| **Responsibilities** | Map source→tests, missing coverage, skipped tests, concrete test suggestions |
| **Inputs** | Changed source files, diff |
| **Outputs** | Test findings or explicit PASS for docs-only |
| **Success** | Specific test file names and case descriptions |
| **Failure** | "Add more tests" without paths; false positive on README-only diff |

**Example:** New `calculateDiscount` in `pricing.js`, no `pricing.test.js` change—HIGH Tests.

## Documentation Reviewer

| Aspect | Detail |
| --- | --- |
| **Responsibilities** | CLI flags, env vars, API changes vs README/docs |
| **Inputs** | Diff, existing README/docs if present |
| **Outputs** | Exact doc files + sections to update |
| **Success** | "Update README § CLI with `--dry-run` example" |
| **Failure** | Generic "update documentation" |

## Risk Reviewer

| Aspect | Detail |
| --- | --- |
| **Responsibilities** | Secrets, eval/exec, injection, AI slop (empty catch, fake imports, vague TODOs) |
| **Inputs** | Diff, changed files |
| **Outputs** | Security/reliability findings; CRITICAL for secrets |
| **Success** | Redacted secret evidence, rotation advice |
| **Failure** | Missing obvious `sk-live-` pattern |

**AI slop patterns** matter because AI-generated PRs often *look* complete but contain subtle garbage.

---

# 10. Hooks Deep Dive

Hooks are **two different systems** in this plugin—do not conflate them in interviews.

## A. Claude Code hook (`hooks/hooks.json`)

| Property | Value |
| --- | --- |
| **Event** | SessionStart |
| **Action** | Run `session-banner.js` |
| **Blocks?** | Never |
| **Purpose** | Remind developer plugin is loaded |

## B. Git hooks (`pre-commit-review.sh`, `pre-push-review.sh`)

Optional. Developer wires into `.git/hooks/` manually (see `hooks/README.md`).

### Pre-commit lifecycle

```
git commit triggered
       │
       ▼
pre-commit-review.sh
       │
       ├── node missing? → exit 0 (skip)
       ├── not git repo? → exit 0
       ├── collect-git-context --staged-only
       ├── regex scan staged diff
       │     ├── API key pattern → CRITICAL finding
       │     ├── password pattern → HIGH
       │     ├── eval( → HIGH
       │     └── empty catch → MEDIUM
       │
       ├── ISSUES=0 → PASS exit 0
       ├── ISSUES>0 + strict → exit 1 (block commit)
       └── ISSUES>0 + default → WARN exit 0 (allow commit)
```

### Pre-push lifecycle

Similar, but scans **branch diff** vs main for skipped tests (`it.skip`, `@pytest.mark.skip`) and secrets.

### Strict mode

```bash
export SMART_REVIEW_STRICT=true
```

When true, hook exits **1** on regex matches → commit/push blocked.

**Important interview nuance:** Strict hooks catch **patterns**, not missing tests or architecture. Full review still needs `/review-pr`.

### How to disable

- Do not install git hooks.
- Unset `SMART_REVIEW_STRICT` or set to `false`.
- Claude SessionStart hook is harmless; remove from `hooks.json` if desired.

### How teams use hooks

| Team maturity | Pattern |
| --- | --- |
| Early adoption | SessionStart banner only |
| Standard | pre-commit warn mode |
| Regulated / PCI | pre-commit strict + `/review-pr` required in CI |

---

# 11. Evaluation System Deep Dive

## Why evaluations matter

LLM outputs are **non-deterministic**. Without evals, you cannot know if a prompt change broke the false-positive guard or stopped flagging secrets.

This plugin uses **lightweight reference evals**—not live LLM calls—because:

- No API keys needed in CI.
- Deterministic `npm run verify`.
- Demonstrates eval *discipline* for the challenge.

## What regressions are

A **regression** is when a previously correct behaviour breaks after a change.

Example regression: test-reviewer starts flagging "missing tests" on README-only diffs. Eval case `false-positive-guard` would fail because output contains forbidden keyword "missing test".

## Golden test cases

Defined in `evals/golden-cases.json`:

| ID | Tests |
| --- | --- |
| `missing-test` | test-reviewer flags missing tests |
| `architecture-violation` | architecture-reviewer flags layer skip |
| `documentation-gap` | documentation-reviewer flags README gap |
| `false-positive-guard` | test-reviewer does NOT false alarm on docs |
| `secret-detection` | risk-reviewer flags CRITICAL secret |

Each case points to a **sample output** in `evals/samples/`—stand-in for what an LLM *should* produce.

## Expected results rules

`evals/expected-results.json` defines machine-checkable rules:

```json
"missing-test": {
  "mustIncludeCategories": ["Tests"],
  "mustIncludeKeywords": ["missing", "test", "calculateDiscount"],
  "mustIncludeSeverity": ["MEDIUM", "HIGH"],
  "mustNotIncludeKeywords": ["CRITICAL", "secret"]
}
```

## How run-evals.js works

1. Load golden cases + expected rules.
2. For each case, read sample markdown.
3. Check keywords, forbidden keywords, severity, categories.
4. Print JSON summary + ✓/✗ lines.
5. Exit 1 if any case failed.

**Run:**

```bash
npm run verify
```

## How success is measured

| Level | Metric |
| --- | --- |
| Harness | 5/5 eval cases pass |
| Report | validate-review-output.js returns valid:true |
| Production (future) | LLM-as-judge on frozen diffs; human labels |

## How to extend

1. Add scenario to `golden-cases.json`.
2. Add rules to `expected-results.json`.
3. Write `evals/samples/your-case-output.md`.
4. Run `node evals/run-evals.js`.

Example new case: **performance**—large loop in hot path flagged by new performance-reviewer sample.

---

# 12. End-to-End Execution Trace

## Scenario setup

Developer modifies `auth_controller.py`:

- Adds new `require_mfa()` decorator logic.
- Does not add tests.
- Does not update API docs.
- Runs `/smart-code-review-guardian:review-pr`.

## Step-by-step internal trace

### Step 1 — Command expansion

Claude Code loads `commands/review-pr.md`. Frontmatter restricts tools to Read, Grep, Glob, Shell, Task. User's slash command becomes the agent's instruction set.

### Step 2 — Git context collection

Claude runs:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-git-context.js"
```

Script logic:

1. Verify git repo.
2. If staged changes → use `git diff --cached`.
3. Else if unstaged → `git diff`.
4. Else → `git diff main...HEAD`.

Returns JSON:

```json
{
  "diffSource": "staged",
  "changedFiles": [{ "status": "modified", "path": "auth_controller.py" }],
  "diff": "..."
}
```

### Step 3 — Bounded file reads

Claude reads:

- `auth_controller.py` (changed).
- Glob: `test_auth.py`, `tests/test_auth*.py`, `auth_controller_test.py`.
- Skim `README.md` / `docs/api.md` if exist.

Does **not** read entire codebase.

### Step 4 — Risk categorisation

Per REVIEW_POLICY.md:

- `auth_controller.py` → **HIGH** (auth path).

### Step 5 — Subagent dispatch (parallel)

| Agent | Triggered? | Why |
| --- | --- | --- |
| architecture-reviewer | Maybe | If imports/layers changed |
| test-reviewer | Yes | Logic changed |
| documentation-reviewer | Yes | Public auth behaviour |
| risk-reviewer | Yes | Auth = security-sensitive |

Each returns markdown findings list.

### Step 6 — Synthesis

Orchestrator merges:

- test-reviewer: HIGH Tests — no test file changed.
- documentation-reviewer: MEDIUM Documentation — MFA not in API docs.
- risk-reviewer: maybe MEDIUM if error handling weak.

Applies PASS/WARN/FAIL rules → likely **WARN** (HIGH test gap, no CRITICAL secret).

### Step 7 — Report output

Fixed template with Missing Context: "CI status unknown."

### Step 8 — Optional validation

```bash
node scripts/validate-review-output.js report.md
```

---

# 13. Real-World Scenarios

Full narrative versions live in `examples/scenario-demo-walkthrough.md`. Summary here:

## Scenario 1: Missing tests

| | |
| --- | --- |
| **Input** | New `calculateDiscount()` in billing module, no test file |
| **Analysis** | test-reviewer maps source→test paths, finds gap |
| **Output** | WARN, HIGH Tests, suggested test cases |
| **Business impact** | Prevents revenue bugs before merge |

## Scenario 2: Architecture violation

| | |
| --- | --- |
| **Input** | Controller queries DB directly |
| **Analysis** | architecture-reviewer cites import + SQL in handler |
| **Output** | WARN, HIGH Architecture |
| **Business impact** | Stops layer erosion early |

## Scenario 3: Hardcoded secret

| | |
| --- | --- |
| **Input** | `API_KEY = 'sk-live-...'` in config |
| **Analysis** | risk-reviewer + pre-commit regex |
| **Output** | FAIL, CRITICAL Security |
| **Business impact** | Avoids credential incident |

## Scenario 4: Documentation gap

| | |
| --- | --- |
| **Input** | New `--dry-run` CLI flag, README unchanged |
| **Analysis** | documentation-reviewer compares diff to README |
| **Output** | MEDIUM Documentation |
| **Business impact** | Fewer support tickets, faster onboarding |

## Scenario 5: Large AI-generated PR

| | |
| --- | --- |
| **Input** | 800-line PR with unused imports, empty catches, vague TODOs |
| **Analysis** | risk-reviewer scans AI slop patterns; orchestrator stays diff-bounded (may truncate at 100KB in collector) |
| **Output** | WARN/FAIL depending on secrets; many MEDIUM Maintainability findings |
| **Business impact** | Reviewer fatigue reduced—machine first pass catches slop |

**Interview tip:** Acknowledge large PRs stress context limits. Collector truncates at 100KB; future improvement is chunked review per module.

---

# 14. AI Design Decisions

## Why AI is used

Review requires language understanding: intent of code, whether a change is user-visible, whether an import crosses layers. Rules-based lint cannot do this holistically.

## Why multiple reviewers

Single prompt mixes concerns → missed issues + muddled severity. Separation mirrors human team: security person, test advocate, architect.

## Why subagents

- **Context isolation:** Each agent gets only relevant files.
- **Parallelism:** Faster than one serial chain.
- **Tool restrictions:** Reviewers cannot edit code.

## Why not one giant prompt

| Giant prompt | This plugin |
| --- | --- |
| Hard to maintain | Edit one skill |
| Context pollution | Focused agents |
| Untestable | Golden cases per reviewer |
| Inconsistent output | Fixed report schema |

## Why context engineering matters

LLMs have finite attention. Diff-first + related files only → higher signal, fewer hallucinations.

Analogy: **Do not ask a lawyer to read every book in the library to review one contract page.**

## How hallucination risks are reduced

1. Evidence required in REVIEW_POLICY.md.
2. Missing Context section mandatory.
3. Glob before claiming test files exist.
4. Label inferred architecture rules.
5. Deterministic git script (LLM does not run git from memory).
6. validate-review-output.js checks structure.

## How reliability is improved

- Policy doc = single scoring source.
- Eval harness catches prompt regressions on reference outputs.
- Hooks provide deterministic secret backstop.
- Structured output enables future CI parsers.

---

# 15. Production Readiness

## Error handling

| Component | Handling |
| --- | --- |
| collect-git-context.js | Exit codes 0/1/2; JSON error for non-repo |
| Hooks | Fail open if node/git missing (exit 0) |
| MCP stub | Returns stub JSON; never throws on missing creds |
| Evals | Per-case errors collected; summary either way |

## Guardrails

Documented in REVIEW_POLICY.md + every skill. Review-only agents cannot Write/Edit.

## Performance

- Diff truncated at 100KB in collector.
- Subagents limited to maxTurns 12–15.
- Bounded Glob patterns—not full repo scan.

## Security

- Redact secrets in output (risk-reviewer instruction).
- No credentials in MCP stub.
- Hooks catch obvious key patterns.
- Plugin does not send code to custom servers (Claude Code handles model API).

## Scalability

- Plugin is stateless; scales with Claude Code seats.
- Team policy forks: REVIEW_POLICY.md overrides.
- Eval cases scale per team conventions.

## Maintainability

- One concern per file (command, skill, agent).
- npm run verify for CI.
- Component READMEs in each directory.

## Deploying in a real company

1. Publish to internal Claude Code marketplace.
2. Pin version in DevEx docs.
3. Optional: git hooks strict on protected branches.
4. CI: `npm run verify` on plugin repo; parse `/review-pr` output on app repos (future).
5. MCP: replace stub with GitHub PR + CI status tools.

---

# 16. Mapping to Challenge Requirements

| Challenge requirement | Implementation | Evidence |
| --- | --- | --- |
| Custom commands | 5 slash commands | `commands/*.md`, `commands/README.md` |
| Skills | 4 reusable skills | `skills/*/SKILL.md` |
| Subagents | 4 specialised agents | `agents/*.md` |
| Hooks | pre-commit, pre-push, hooks.json | `hooks/` |
| Evaluations | Golden cases + runner | `evals/`, `npm run verify` |
| `/review-pr` main command | Full workflow | `commands/review-pr.md` |
| Git diff inspection | collect-git-context.js | `scripts/` |
| Risk categorisation | REVIEW_POLICY.md | Risk levels table |
| Structured report | Fixed markdown template | `examples/sample-review-output.md` |
| PASS/WARN/FAIL | Policy rules | REVIEW_POLICY.md § Overall status |
| Hallucination guardrails | Skills + Missing Context | All skills, REVIEW_POLICY.md |
| Extra commands | architecture, tests, docs, evals | `commands/` |
| MCP stub (optional) | review-context-stub.js | `mcp/`, `.mcp.json` |
| README | Full user docs | `README.md` |
| REFLECTION.md | 7 questions | `REFLECTION.md` |
| AI_PROMPTS.md | Build log | `AI_PROMPTS.md` |
| Examples | Sample + demos | `examples/` |
| Reusable harness | Composable components | Architecture §4 |

---

# 17. Interview Preparation

## 20 likely questions with strong answers

### Q1: What problem does this plugin solve?

**Answer:** It gives developers a structured, evidence-backed first-pass code review on their git diff before merge—catching missing tests, architecture violations, doc gaps, and security issues that human review often misses under time pressure.

**Why strong:** Ties to pain points, not features. Mentions *when* it runs (before merge).

### Q2: Why did you choose this architecture?

**Answer:** I split orchestration (code-review-skill + `/review-pr`) from specialised reviewers (four subagents) so each concern has focused context, parallel execution, and independently testable behaviour via golden eval cases.

**Why strong:** Shows deliberate decomposition, not accidental folder structure.

### Q3: Why use subagents instead of one prompt?

**Answer:** Single prompts mix security, tests, and architecture—models drop details. Subagents mirror human specialists, get smaller context windows, and can run in parallel. Review-only tool restrictions prevent silent auto-fixes.

**Why strong:** Compares to human process; mentions tool restrictions.

### Q4: How do you prevent hallucinations?

**Answer:** Four layers: policy requiring file evidence, Missing Context instead of guessing, deterministic git collection script, and eval false-positive guard. Agents must Glob before claiming test files exist.

**Why strong:** Concrete mechanisms, not "we told the model to be careful."

### Q5: How would you scale this to multiple teams?

**Answer:** Distribute via Claude Code marketplace, let teams fork REVIEW_POLICY.md or add policy packs, extend eval golden cases per stack, optional MCP for org-specific GitHub/CI context.

**Why strong:** Shows platform thinking.

### Q6: How would you measure success?

**Answer:** Outcome metrics: defect escape rate, finding action rate, false positive rate, time-to-merge—not just command invocations.

**Why strong:** Distinguishes adoption from impact (REFLECTION.md).

### Q7: What are the limitations?

**Answer:** Evals test reference outputs, not live LLM quality every run. Hooks use regex—cannot catch missing tests. Architecture rules may be inferred without ARCHITECTURE.md. Large diffs truncate at 100KB.

**Why strong:** Honest; interviewers trust candidates who know limits.

### Q8: Why Claude Code plugin vs a standalone script?

**Answer:** Plugins bundle commands, skills, agents, hooks, and MCP in a reusable package installable across repos via `--plugin-dir` or marketplace—it's an engineering harness, not a one-off script.

**Why strong:** Maps to challenge requirements directly.

### Q9: Explain the eval system.

**Answer:** Five golden scenarios with sample reviewer markdown and JSON keyword/severity rules. `run-evals.js` verifies harness behaviour deterministically in CI via `npm run verify`.

**Why strong:** Shows eval discipline without overclaiming LLM testing.

### Q10: What happens in strict mode?

**Answer:** Git hooks exit non-zero on regex matches for secrets and risky patterns—blocking commit/push. AI review can still FAIL independently on CRITICAL findings. Strict mode does not detect missing tests.

**Why strong:** Nuanced—shows you understand two hook layers.

### Q11: Walk me through `/review-pr`.

**Answer:** Command loads workflow → collect-git-context.js → read changed files + bounded docs → categorise risk → parallel subagents → merge into fixed report → optional validation.

**Why strong:** End-to-end trace (Section 12).

### Q12: Why REVIEW_POLICY.md?

**Answer:** Single scoring source of truth so commands, skills, and agents do not disagree on PASS vs FAIL. Humans can override policy per org without rewriting prompts.

**Why strong:** Separation of policy from procedure.

### Q13: How does context engineering work here?

**Answer:** Diff-first priority (staged → working → branch), read changed files plus directly related tests/docs only, 100KB diff cap, Missing Context for uncertainty.

**Why strong:** Uses project vocabulary correctly.

### Q14: Why an MCP stub?

**Answer:** Placeholder for future GitHub PR metadata and CI status without requiring credentials in the challenge submission. Proves integration point exists.

**Why strong:** Scope control + future vision.

### Q15: How do you handle AI-generated code slop?

**Answer:** risk-reviewer checks empty catches, fake imports, vague TODOs, hardcoded paths—patterns common in Copilot/Claude-generated PRs.

**Why strong:** Specific patterns, timely concern.

### Q16: What would you build in one month?

**Answer:** Live LLM eval on frozen diffs, GitHub MCP for PR comments, team policy pack loader, secret scanner integration (gitleaks).

**Why strong:** Prioritized roadmap (Section 18).

### Q17: Why separate commands AND skills?

**Answer:** Commands are explicit UX (`/review-pr`). Skills are model-invoked when user says "review my changes" without knowing the slash command. Same logic, different entry points.

**Why strong:** UX + discoverability.

### Q18: How do hooks stay non-intrusive?

**Answer:** Default warn-only; SessionStart prints one line; full review is opt-in via slash command. Strict is env-var opt-in.

**Why strong:** Developer empathy.

### Q19: What was the hardest trade-off?

**Answer:** Eval depth vs determinism—I chose keyword-based reference evals instead of flaky live LLM calls, but documented that production needs LLM-as-judge layer.

**Why strong:** Shows engineering judgment.

### Q20: Demo this in 60 seconds.

**Answer:** Use cheat sheet § 1-minute explanation below, then run `npm run verify` and show scenario walkthrough Scenario 3 (secret → FAIL).

**Why strong:** Action-oriented.

---

# 18. Future Improvements

## 1 week

- Add LLM eval script scaffolding (frozen diff fixtures).
- GitHub Action running `npm run verify` on plugin repo.
- Policy override file `policy/local.yaml` loader stub.

## 1 month

- Real GitHub MCP (PR metadata, checks status).
- Post review comments via GitHub API.
- gitleaks integration in pre-commit hook.
- Team-specific golden cases from historical PRs.

## 3 months

- LLM-as-judge eval pipeline on labelled diffs.
- Chunked review for PRs >100KB.
- Frontend/backend policy pack plugins.
- Dashboard: WARN/FAIL rates, false positives.

## 6 months

- Org-wide marketplace with pinned versions.
- Branch protection: require PASS report.
- Fine-tuned small model for regex+embedding pre-filter.
- Integration with Jira/Linear for auto-tickets on CRITICAL findings.

## MCP integration ideas

| Tool | Purpose |
| --- | --- |
| `get_pull_request` | Fetch PR title, author, changed files from GitHub |
| `get_check_runs` | Know if CI already failed |
| `post_review_comment` | Publish report summary on PR |
| `get_file_contents` | Bounded fetch without full clone |

Replace `mcp/review-context-stub.js` incrementally—stub remains fallback when token absent.

---

# 19. Lessons Learned

## Engineering lessons

- **Separate deterministic from probabilistic:** Git in Node; judgment in LLM.
- **Schema-first output:** Enables validation and future CI parsers.
- **Component READMEs:** Each folder documents itself—lowers bus factor.

## AI lessons

- Models confidently invent tests and standards—guardrails must be procedural.
- Specialised prompts beat one mega-prompt for recall on specific issue types.
- False-positive guards need first-class eval cases, not afterthoughts.

## Product lessons

- Developers tolerate AI review only if it is actionable and non-blocking by default.
- PASS/WARN/FAIL is more legible to managers than prose paragraphs.

## Evaluation lessons

- Reference evals are cheap and CI-friendly; LLM evals are necessary at scale but expensive/flaky.
- Each golden case should map to one reviewer responsibility.

## Context engineering lessons

- Diff-first is the highest-leverage constraint.
- Missing Context is a feature—it builds trust.

---

# 20. Cheat Sheet

## 1-minute explanation

"Smart Code Review Guardian is a Claude Code plugin that reviews your git diff before merge. You run `/smart-code-review-guardian:review-pr`, it collects your changes, runs four specialised AI reviewers—architecture, tests, docs, and security—and outputs a structured PASS/WARN/FAIL report with evidence. It's a reusable harness with hooks and evals, not a one-off prompt."

## 3-minute explanation

Add:

- **Problem:** Human review is slow and inconsistent; AI chat reviews hallucinate.
- **Architecture:** Command → git script → orchestrator skill → four subagents → fixed report.
- **Differentiator:** Bounded context, Missing Context section, golden-case evals (`npm run verify`).
- **Hooks:** Optional regex backstop for secrets; strict mode blocks commits.
- **Users:** Developers pre-PR; platform teams distribute via marketplace.

## 5-minute explanation

Add:

- Walk Scenario 3 from `examples/scenario-demo-walkthrough.md` (secret → FAIL).
- Show `REVIEW_POLICY.md` scoring table.
- Mention MCP stub for future GitHub integration.
- Limitations: evals test reference outputs; hooks do not catch missing tests.

## 10-minute interview explanation

Structure your answer:

1. **Problem + user** (2 min) — Section 1–3.
2. **Live demo** (3 min) — `npm run verify`, open sample report, run `/review-pr` if Claude Code available.
3. **Architecture** (2 min) — Draw diagram from Section 4 on whiteboard.
4. **AI decisions** (2 min) — Subagents, context engineering, hallucination guardrails.
5. **Production + roadmap** (1 min) — Section 15 + one-month roadmap.

**Closing line:** "I designed this as an evaluable, composable harness because AI features without measurement and guardrails do not survive production adoption."

---

## Quick reference commands

```bash
# Load plugin
claude --plugin-dir .

# Full review (in Claude Code)
/smart-code-review-guardian:review-pr

# Verify harness before interview
npm run verify

# Git context JSON
node scripts/collect-git-context.js

# Evals only
node evals/run-evals.js

# Validate a report file
node scripts/validate-review-output.js examples/sample-review-output.md
```

## File to read before specific questions

| Question type | Read first |
| --- | --- |
| Scoring / PASS/WARN/FAIL | REVIEW_POLICY.md |
| Demo scenarios | examples/scenario-demo-walkthrough.md |
| Build story | AI_PROMPTS.md |
| Trade-offs | REFLECTION.md |
| Requirement mapping | SUBMISSION_CHECKLIST.md |
| Command details | commands/review-pr.md |
| Eval extension | evals/README.md |

---

*End of MASTER_GUIDE.md*
