import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export class WorkflowStore {
  private db: Database.Database;

  constructor() {
    const configDir = join(homedir(), '.dharma');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    const dbPath = join(configDir, 'workflows.db');
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        context TEXT,
        agent TEXT,
        project TEXT,
        tags TEXT,
        status TEXT DEFAULT 'active',
        outcome TEXT,
        duration_minutes INTEGER,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS blockers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        blocker TEXT NOT NULL,
        details TEXT,
        category TEXT,
        status TEXT DEFAULT 'open',
        resolution TEXT,
        outcome TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS handoffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
      CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent);
      CREATE INDEX IF NOT EXISTS idx_blockers_status ON blockers(status);
      CREATE INDEX IF NOT EXISTS idx_blockers_task ON blockers(task_id);
    `);
  }

  startTask(args: any) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (task, context, agent, project, tags)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      args.task,
      args.context || null,
      args.agent || null,
      args.project || null,
      JSON.stringify(args.tags || [])
    );

    return {
      content: [
        {
          type: 'text',
          text: `Task started (ID: ${result.lastInsertRowid})\n\n` +
                `Task: ${args.task}\n` +
                (args.agent ? `Agent: ${args.agent}\n` : '') +
                (args.project ? `Project: ${args.project}\n` : '') +
                (args.context ? `Context: ${args.context}` : ''),
        },
      ],
    };
  }

  completeTask(args: any) {
    const stmt = this.db.prepare(`
      UPDATE tasks
      SET status = 'completed',
          outcome = ?,
          duration_minutes = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(args.outcome, args.duration_minutes || null, args.task_id);

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.task_id} completed\n\n` +
                `Outcome: ${args.outcome}\n` +
                (args.duration_minutes ? `Duration: ${args.duration_minutes} minutes` : ''),
        },
      ],
    };
  }

  recordBlocker(args: any) {
    const stmt = this.db.prepare(`
      INSERT INTO blockers (task_id, blocker, details, category)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      args.task_id,
      args.blocker,
      args.details || null,
      args.category || null
    );

    return {
      content: [
        {
          type: 'text',
          text: `Blocker recorded (ID: ${result.lastInsertRowid})\n\n` +
                `Task ID: ${args.task_id}\n` +
                `Blocker: ${args.blocker}\n` +
                (args.details ? `Details: ${args.details}\n` : '') +
                (args.category ? `Category: ${args.category}` : ''),
        },
      ],
    };
  }

  resolveBlocker(args: any) {
    const stmt = this.db.prepare(`
      UPDATE blockers
      SET status = 'resolved',
          resolution = ?,
          outcome = ?,
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(args.resolution, args.outcome || null, args.blocker_id);

    return {
      content: [
        {
          type: 'text',
          text: `Blocker ${args.blocker_id} resolved\n\n` +
                `Resolution: ${args.resolution}\n` +
                (args.outcome ? `Outcome: ${args.outcome}` : ''),
        },
      ],
    };
  }

  getWorkflowPatterns(args: any) {
    const query = args.task_type?.toLowerCase() || '';
    
    let stmt;
    let results;

    if (args.project) {
      stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE project = ? AND status = 'completed'
        AND (LOWER(task) LIKE ? OR ? = '')
        ORDER BY completed_at DESC
        LIMIT 10
      `);
      results = stmt.all(args.project, `%${query}%`, query);
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE status = 'completed'
        AND (LOWER(task) LIKE ? OR ? = '')
        ORDER BY completed_at DESC
        LIMIT 10
      `);
      results = stmt.all(`%${query}%`, query);
    }

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: 'No workflow patterns found.' }],
      };
    }

    const text = results
      .map((r: any) => {
        return `[${r.completed_at}] ${r.project ? `[${r.project}] ` : ''}\n` +
               `Task: ${r.task}\n` +
               `Agent: ${r.agent || 'N/A'}\n` +
               `Duration: ${r.duration_minutes || 'N/A'} minutes\n` +
               `Outcome: ${r.outcome}\n` +
               `---`;
      })
      .join('\n\n');

    return {
      content: [{ type: 'text', text: `Workflow Patterns:\n\n${text}` }],
    };
  }

  suggestNext(args: any) {
    const query = args.current_task.toLowerCase();

    const stmt = this.db.prepare(`
      SELECT t.*, b.blocker, b.resolution
      FROM tasks t
      LEFT JOIN blockers b ON t.id = b.task_id
      WHERE LOWER(t.task) LIKE ?
      AND t.status = 'completed'
      ORDER BY t.completed_at DESC
      LIMIT 5
    `);

    const results = stmt.all(`%${query}%`);

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: 'No similar tasks found in history.' }],
      };
    }

    const suggestions = results
      .map((r: any) => {
        let text = `Based on: ${r.task}\n`;
        if (r.blocker) {
          text += `  ⚠️  Watch out: ${r.blocker}\n`;
          if (r.resolution) {
            text += `  ✓ Resolution: ${r.resolution}\n`;
          }
        }
        text += `  Duration: ${r.duration_minutes || 'N/A'} minutes`;
        return text;
      })
      .join('\n\n');

    return {
      content: [{ type: 'text', text: `Suggestions based on history:\n\n${suggestions}` }],
    };
  }

  recordHandoff(args: any) {
    const stmt = this.db.prepare(`
      INSERT INTO handoffs (task_id, from_agent, to_agent, context)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      args.task_id,
      args.from_agent,
      args.to_agent,
      args.context || null
    );

    // Update task agent
    const updateStmt = this.db.prepare('UPDATE tasks SET agent = ? WHERE id = ?');
    updateStmt.run(args.to_agent, args.task_id);

    return {
      content: [
        {
          type: 'text',
          text: `Task ${args.task_id} handed off\n\n` +
                `From: ${args.from_agent}\n` +
                `To: ${args.to_agent}\n` +
                (args.context ? `Context: ${args.context}` : ''),
        },
      ],
    };
  }

  getTimeline(args: any) {
    const days = args.days || 7;
    let stmt;
    let results;

    const conditions = [];
    const params: any[] = [];

    if (args.project) {
      conditions.push('project = ?');
      params.push(args.project);
    }

    if (args.agent) {
      conditions.push('agent = ?');
      params.push(args.agent);
    }

    conditions.push("started_at >= datetime('now', '-' || ? || ' days')");
    params.push(days);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    stmt = this.db.prepare(`
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY started_at DESC
    `);

    results = stmt.all(...params);

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No tasks found in the last ${days} days.` }],
      };
    }

    const text = results
      .map((r: any) => {
        return `[${r.started_at}] ${r.status === 'completed' ? '✓' : '⏳'} ${r.task}\n` +
               `  Agent: ${r.agent || 'N/A'} | Project: ${r.project || 'N/A'}`;
      })
      .join('\n\n');

    return {
      content: [{ type: 'text', text: `Timeline (last ${days} days):\n\n${text}` }],
    };
  }
}
