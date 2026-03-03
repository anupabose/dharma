# Architecture

## Overview

Dharma is a local-first MCP server for tracking task execution, workflow patterns, and multi-agent coordination.

## Components

### 1. MCP Server (`src/index.ts`)
- Implements Model Context Protocol server
- Handles tool registration and execution
- Supports stdio transport (HTTP planned)

### 2. Workflow Store (`src/store.ts`)
- SQLite database wrapper
- Three main tables:
  - `tasks`: Task execution records with context and outcomes
  - `blockers`: Blockers encountered during execution
  - `handoffs`: Agent-to-agent task transfers
- Pattern detection and suggestion engine

### 3. Tools

#### `start_task`
Begin tracking a task:
- Task description
- Execution context
- Agent assignment
- Project association
- Tags

#### `complete_task`
Mark task complete:
- Task ID
- Outcome description
- Duration tracking

#### `block`
Record a blocker:
- Related task ID
- Blocker description
- Details and category
- Auto-tracked timestamp

#### `resolve`
Document resolution:
- Blocker ID
- Resolution method
- Outcome

#### `workflow`
Analyze patterns:
- Filter by task type
- Filter by project
- Returns common execution patterns

#### `suggest_next`
Get suggestions:
- Based on current task
- Learns from similar past tasks
- Highlights potential blockers

#### `handoff`
Agent coordination:
- Task transfer between agents
- Context preservation
- Agent activity tracking

#### `timeline`
Execution history:
- Filter by project/agent
- Time-based view
- Status indicators

## Data Flow

```
Agent → Start Task → Execute → Hit Blocker? → Resolve → Complete
                         ↓                        ↓
                    Record Context          Learn Pattern
                         ↓                        ↓
                    SQLite DB ← Pattern Analysis ←
                         ↓
                  Suggest Next Steps
```

## Pattern Learning

1. **Task Similarity**: Matches tasks by description
2. **Blocker Prediction**: Identifies common blockers for task types
3. **Duration Estimation**: Learns typical execution times
4. **Agent Expertise**: Tracks which agents handle which tasks
5. **Workflow Sequences**: Detects common task chains

## Future Enhancements

1. **Vector Search**: Semantic task matching
2. **Dependency Graphs**: Visualize task relationships
3. **Outcome Prediction**: ML-based success prediction
4. **Auto-handoff**: Suggest optimal agent for tasks
5. **Workflow Templates**: Auto-generate from patterns
6. **Real-time Monitoring**: Active task status tracking
7. **Resources**: Expose workflow data as MCP resources
8. **Prompts**: Guided workflow optimization

## Storage

- Config: `~/.dharma/config.json`
- Database: `~/.dharma/workflows.db`
- All data stays local
- Single SQLite file for portability

## Multi-Agent Coordination

Dharma enables multiple AI agents to:
- Share task execution history
- Learn from each other's experiences
- Coordinate handoffs with context
- Avoid repeating mistakes
- Build collective workflow intelligence
