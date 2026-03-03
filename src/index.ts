#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WorkflowStore } from './store.js';
import { program } from 'commander';

const store = new WorkflowStore();

const server = new Server(
  {
    name: 'dharma',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'start_task',
        description: 'Begin tracking a task with full context',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Task description' },
            context: { type: 'string', description: 'Execution context' },
            agent: { type: 'string', description: 'Agent handling the task' },
            project: { type: 'string', description: 'Project name' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
          },
          required: ['task'],
        },
      },
      {
        name: 'complete_task',
        description: 'Mark task complete with outcome',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'number', description: 'Task ID' },
            outcome: { type: 'string', description: 'Task outcome' },
            duration_minutes: { type: 'number', description: 'Time taken' },
          },
          required: ['task_id', 'outcome'],
        },
      },
      {
        name: 'block',
        description: 'Record a blocker with details',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'number', description: 'Related task ID' },
            blocker: { type: 'string', description: 'Blocker description' },
            details: { type: 'string', description: 'Additional details' },
            category: { type: 'string', description: 'Blocker category' },
          },
          required: ['task_id', 'blocker'],
        },
      },
      {
        name: 'resolve',
        description: 'Document blocker resolution',
        inputSchema: {
          type: 'object',
          properties: {
            blocker_id: { type: 'number', description: 'Blocker ID' },
            resolution: { type: 'string', description: 'How it was resolved' },
            outcome: { type: 'string', description: 'Result of resolution' },
          },
          required: ['blocker_id', 'resolution'],
        },
      },
      {
        name: 'workflow',
        description: 'Retrieve common workflow patterns',
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string', description: 'Type of task to analyze' },
            project: { type: 'string', description: 'Filter by project' },
          },
        },
      },
      {
        name: 'suggest_next',
        description: 'Get next step suggestions from history',
        inputSchema: {
          type: 'object',
          properties: {
            current_task: { type: 'string', description: 'Current task description' },
            context: { type: 'string', description: 'Current context' },
          },
          required: ['current_task'],
        },
      },
      {
        name: 'handoff',
        description: 'Record agent-to-agent task transfer',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'number', description: 'Task ID' },
            from_agent: { type: 'string', description: 'Source agent' },
            to_agent: { type: 'string', description: 'Target agent' },
            context: { type: 'string', description: 'Handoff context' },
          },
          required: ['task_id', 'from_agent', 'to_agent'],
        },
      },
      {
        name: 'timeline',
        description: 'View task execution timeline',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Filter by project' },
            agent: { type: 'string', description: 'Filter by agent' },
            days: { type: 'number', description: 'Days to look back', default: 7 },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'start_task':
      return store.startTask(args);
    case 'complete_task':
      return store.completeTask(args);
    case 'block':
      return store.recordBlocker(args);
    case 'resolve':
      return store.resolveBlocker(args);
    case 'workflow':
      return store.getWorkflowPatterns(args);
    case 'suggest_next':
      return store.suggestNext(args);
    case 'handoff':
      return store.recordHandoff(args);
    case 'timeline':
      return store.getTimeline(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  program
    .name('dharma')
    .description('Local-first task orchestration for AI agents')
    .option('--http', 'Run in HTTP mode')
    .option('--port <port>', 'HTTP port', '4040')
    .parse();

  const options = program.opts();

  if (options.http) {
    console.error('HTTP mode not yet implemented. Use stdio mode.');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dharma MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
