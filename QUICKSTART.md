# Quick start — commands & how to test

Short reference for running and testing **Smart Code Review Guardian**.

---

## Before you start

| Need | Check |
| --- | --- |
| Node.js 18+ | `node --version` |
| Git | `git --version` |
| Claude Code (for AI commands) | `claude --version` |

### Which terminal? (important)

On Windows, **Cursor’s terminal is PowerShell** — that’s what we mean by “PowerShell.” You do **not** need a separate Windows app.

Claude Code **takes over one terminal tab** while it runs (you see the `❯` prompt). You cannot type `git add` in that same tab at the same time.

**Use two terminal tabs in Cursor:**

| Tab | Use for |
| --- | --- |
| **Terminal 1** | `claude --plugin-dir .` → slash commands (`/review-pr`, etc.) |
| **Terminal 2** | `npm run verify`, `git add`, edit files, `node scripts/...` |

**How to open a second tab in Cursor:** click **+** in the Terminal panel, or `` Ctrl+Shift+` `` again, or **Terminal → New Terminal**.

```
┌─────────────────────────────────────┐
│  Terminal 1 — Claude Code (❯)       │  ← /smart-code-review-guardian:review-pr
├─────────────────────────────────────┤
│  Terminal 2 — PowerShell            │  ← git add, npm run verify
└─────────────────────────────────────┘
```

**Load the plugin (Terminal 1):**

```powershell
cd "c:\apply\AI product engineer-Smartr365\Smart Code Review Guardian"
claude --plugin-dir .
```

Use the **`❯` Claude Code prompt** for slash commands (not the Cursor chat sidebar).

After changing plugin files: `/reload-plugins`

Validate plugin: `claude plugin validate .` → must say **Validation passed**.

---

## Two ways to test

| Way | Where | What it proves |
| --- | --- | --- |
| **Scripts** | PowerShell | Evals, git helper, report format work |
| **Slash commands** | Claude Code (`❯`) | Full AI review works |

---

## Scripts (PowerShell — no AI)

| Command | What it does | How to test | Good result |
| --- | --- | --- | --- |
| `npm run verify` | Evals + sample report check | Run in plugin folder | 5/5 passed, `valid: true` |
| `npm run evals` | Golden cases only | Same | 5/5 passed |
| `node scripts/collect-git-context.js` | Git diff as JSON | Stage a file first: `git add README.md` | JSON with `changedFiles` |
| `node scripts/validate-review-output.js examples/sample-review-output.md` | Report structure check | Run as shown | `"valid": true` |

---

## Plugin slash commands (Claude Code `❯`)

All commands use the namespace **`/smart-code-review-guardian:`**

Open the **Custom commands** menu in Claude Code, or type the full name below.

| Command | Purpose |
| --- | --- |
| `/smart-code-review-guardian:review-pr` | **Full review** — tests, architecture, docs, risk → PASS/WARN/FAIL report |
| `/smart-code-review-guardian:review-architecture` | Architecture / layer issues only |
| `/smart-code-review-guardian:check-tests` | Missing or weak tests only |
| `/smart-code-review-guardian:check-docs` | README / docs gaps only |
| `/smart-code-review-guardian:run-review-evals` | Runs `npm run evals` inside the session |

**Related skill (same family, orchestrator):**

| Command | Purpose |
| --- | --- |
| `/smart-code-review-guardian:code-review-skill` | Full review workflow (alternative to `review-pr`) |

---

## How to test each slash command

### 1. `run-review-evals` (easiest — start here)

**Setup:** None.

**Run:**

```
/smart-code-review-guardian:run-review-evals
```

**Pass:** Output shows 5/5 cases passed.

---

### 2. `review-pr` (main demo)

**Setup:** Stage a real change:

```powershell
git add README.md
```

**Run:**

```
/smart-code-review-guardian:review-pr
```

**Pass:** Report with `Overall Status`, `Risk Score`, `Findings`, `Final Decision`.

**Tip:** Avoid `echo "text" >> README.md` on Windows (can add bad encoding). Edit files in Cursor instead.

---

### 3. `check-tests`

**Setup:** Change a code file without changing its test file (or add a new `.js` / `.py` function with no test).

**Run:**

```
/smart-code-review-guardian:check-tests
```

**Pass:** Finds missing tests, or says PASS if only docs changed.

---

### 4. `check-docs`

**Setup:** Add a CLI flag or env var in code but do **not** update README.

**Run:**

```
/smart-code-review-guardian:check-docs
```

**Pass:** Flags README/docs gap with suggested section to update.

---

### 5. `review-architecture`

**Setup:** Change a controller/route file to import a database client directly (or any obvious layer skip).

**Run:**

```
/smart-code-review-guardian:review-architecture
```

**Pass:** Architecture finding with file path and evidence, or PASS if change is docs-only.

---

## Subagents (optional check)

In Claude Code:

```
/agents
```

Expect: `architecture-reviewer`, `test-reviewer`, `documentation-reviewer`, `risk-reviewer`.

These run automatically during `/review-pr`; you do not call them separately unless experimenting.

---

## 5-minute test checklist

```
[ ] PowerShell: npm run verify
[ ] PowerShell: claude --plugin-dir .
[ ] Claude:     /smart-code-review-guardian:run-review-evals
[ ] PowerShell: git add <a changed file>
[ ] Claude:     /smart-code-review-guardian:review-pr
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Command not listed | `/reload-plugins` or restart `claude --plugin-dir .` |
| “No changes” | `git add` at least one file |
| Plugin won’t load | `claude plugin validate .` |
| Wrong terminal | Slash commands only work at Claude **`❯`**, not Cursor chat |

---

## More detail

- Full scenarios: [examples/scenario-demo-walkthrough.md](examples/scenario-demo-walkthrough.md)
- Command reference: [docs/commands.md](docs/commands.md)
- Interview / deep dive: [MASTER_GUIDE.md](MASTER_GUIDE.md)
