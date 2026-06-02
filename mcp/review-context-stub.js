#!/usr/bin/env node
/**
 * Optional MCP stub for Smart Code Review Guardian.
 * Provides placeholder tools for future integrations (GitHub PR metadata, CI status)
 * without requiring external credentials.
 *
 * Usage: enabled via plugin .mcp.json when Claude Code loads the plugin.
 * Safe to ignore if MCP is not needed for local reviews.
 */

const readline = require('readline');

const TOOLS = [
  {
    name: 'get_review_context',
    description:
      'Returns stub review context. Replace with real GitHub/CI integration in production deployments.',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository name (optional)' },
        prNumber: { type: 'number', description: 'Pull request number (optional)' },
      },
    },
  },
  {
    name: 'get_ci_status',
    description: 'Returns stub CI status. No external API calls are made.',
    inputSchema: {
      type: 'object',
      properties: {
        branch: { type: 'string', description: 'Branch name (optional)' },
      },
    },
  },
];

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function handleRequest(request) {
  const { id, method, params } = request;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'review-context-stub', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    return;
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};

    if (name === 'get_review_context') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  mode: 'stub',
                  message:
                    'MCP stub active. No external credentials configured. Use local git diff and repo files for review context.',
                  repository: args.repository || null,
                  prNumber: args.prNumber || null,
                  suggestedSources: ['git diff', 'README.md', 'ARCHITECTURE.md', 'package.json'],
                },
                null,
                2
              ),
            },
          ],
        },
      });
      return;
    }

    if (name === 'get_ci_status') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  mode: 'stub',
                  branch: args.branch || 'unknown',
                  status: 'unknown',
                  message: 'CI integration not configured. Verify tests locally.',
                },
                null,
                2
              ),
            },
          ],
        },
      });
      return;
    }

    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unknown tool: ${name}` },
    });
    return;
  }

  if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
    return;
  }

  if (id !== undefined) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    handleRequest(JSON.parse(line));
  } catch (err) {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: `Parse error: ${err.message}` },
    });
  }
});
