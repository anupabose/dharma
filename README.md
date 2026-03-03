# Dharma

**Local-first task orchestration and workflow memory for AI agents via MCP.**

*Dharma (धर्म) — Sanskrit for "duty, responsibility, workflow"*

Track task execution, learn workflow patterns, and coordinate multi-agent work.

## What is this?

A standalone MCP server that remembers how tasks flow, what blocks progress, and how agents coordinate. Built on SQLite for local-first workflow intelligence.

| | Dharma | Traditional Task Trackers |
|---|---|---|
| **Focus** | Workflow patterns & execution | Task completion |
| **Learning** | Auto-detects patterns | Manual templates |
| **Blockers** | Tracks & suggests resolutions | Just records status |
| **Multi-agent** | Agent handoff memory | Single user |
| **Privacy** | 100% local | Cloud-based |

## Install

```bash
npm install -g dharma
```

## Usage

```bash
# stdio mode (for Claude Code, Cursor, etc.)
dharma

# HTTP mode (for remote agents)
dharma --http --port 4040
```

## MCP Client Configuration

### Claude Code

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "dharma": {
      "command": "dharma"
    }
  }
}
```

### Cursor

Add to MCP settings:

```json
{
  "mcpServers": {
    "dharma": {
      "command": "npx",
      "args": ["dharma"]
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `start_task` | Begin tracking a task with full context |
| `complete_task` | Mark task complete with outcome |
| `block` | Record a blocker with details |
| `resolve` | Document blocker resolution |
| `workflow` | Retrieve common workflow patterns |
| `suggest_next` | Get next step suggestions from history |
| `handoff` | Record agent-to-agent task transfer |
| `timeline` | View task execution timeline |

## Resources

| URI | Description |
|---|---|
| `dharma://active` | Currently active tasks |
| `dharma://blockers` | Open blockers |
| `dharma://patterns` | Learned workflow patterns |
| `dharma://agents` | Agent activity history |

## Prompts

| Name | Description |
|---|---|
| `workflow-review` | Analyze workflow efficiency |
| `blocker-analysis` | Review recurring blockers |
| `agent-handoff` | Prepare context for agent transfer |

## Configuration

Config lives at `~/.dharma/config.json`:

```json
{
  "db_path": "~/.dharma/workflows.db",
  "server": {
    "transport": "stdio",
    "port": 4040
  }
}
```

## How it works

1. Agent calls `start_task` to begin tracking
2. Task execution is monitored with context
3. Blockers are recorded with `block` tool
4. Resolutions are captured with `resolve`
5. `workflow` analyzes patterns across similar tasks
6. `suggest_next` recommends steps based on history
7. All data stays local in SQLite

## Use Cases

- **"What's the typical deployment workflow?"** - Learn from past executions
- **"How did I resolve authentication errors before?"** - Blocker resolution history
- **"What usually follows code review?"** - Pattern-based suggestions
- **"Which agent handled database migrations?"** - Agent coordination memory
- **"Show me all API-related blockers"** - Semantic blocker search

## Example Workflow

```javascript
// Agent 1 starts a task
start_task({
  task: "Deploy new API endpoint",
  context: "Production deployment",
  agent: "deployment-agent"
})

// Hits a blocker
block({
  task_id: 123,
  blocker: "Database migration failed",
  details: "Connection timeout to prod DB"
})

// Resolves it
resolve({
  blocker_id: 456,
  resolution: "Increased connection timeout to 30s",
  outcome: "Migration successful"
})

// Completes task
complete_task({
  task_id: 123,
  outcome: "API deployed successfully",
  duration_minutes: 45
})

// Next time, get suggestions
suggest_next({
  current_task: "Deploy new API endpoint"
})
// Returns: "Check database connection timeout settings (resolved blocker in previous deployment)"
```

## License

MIT

## Topics

`typescript` `ai` `workflow` `mcp` `agents` `orchestration` `local-first` `sqlite` `task-tracking`
