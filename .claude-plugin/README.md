Claude Code requires the plugin manifest at this path:

```
.claude-plugin/plugin.json
```

Do not move `commands/`, `skills/`, `agents/`, or `hooks/` into this directory — they must remain at the plugin root per [Claude Code plugin docs](https://code.claude.com/docs/en/plugins).

The challenge brief listed `plugin.json` at the repository root; this project follows the official `.claude-plugin/` layout instead. See `SUBMISSION_CHECKLIST.md` for the mapping.
