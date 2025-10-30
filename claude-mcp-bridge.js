#!/usr/bin/env node

/**
 * Claude Desktop MCP Bridge for Memory API
 * This creates a proper STDIO-based MCP server for Claude Desktop
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import http from 'http';

// Configuration
const API_URL = 'http://localhost:8787/mcp-server';
const API_KEY = process.env.API_KEY; // No hardcoded fallback

// Create MCP server
const server = new Server(
  {
    name: 'memory-api',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to make HTTP requests to your server
async function makeHttpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.random().toString(36).substr(2, 9),
      method: method,
      params: params
    });
    
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: '/mcp-server' + (API_KEY ? ('?api_key=' + encodeURIComponent(API_KEY)) : ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(data);
          if (jsonResponse.error) {
            reject(new Error(jsonResponse.error.message));
          } else {
            resolve(jsonResponse.result);
          }
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + data));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'store_memory',
        description: 'Store a new memory with optional metadata. Use this to remember important information.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to remember'
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata (tags, category, etc.)'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'search_memory',
        description: 'Search memories using semantic similarity. Use this to find relevant information.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'What to search for'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5)',
              default: 5
            }
          },
          required: ['query']
        }
      },
      {
        name: 'list_memories',
        description: 'List recent memories in chronological order. Use this to see what you have stored.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of memories to retrieve (default: 20)',
              default: 20
            }
          }
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete a specific memory by ID. Use this to remove unwanted information.',
        inputSchema: {
          type: 'object',
          properties: {
            memoryId: {
              type: 'string',
              description: 'The ID of the memory to delete'
            }
          },
          required: ['memoryId']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'store_memory':
        const storeResult = await makeHttpRequest('tools/call', {
          name: 'store_memory',
          arguments: args
        });
        return {
          content: [
            {
              type: 'text',
              text: `✅ Memory stored successfully!\n\nContent: ${args.content}\n${args.metadata ? `Metadata: ${JSON.stringify(args.metadata)}` : ''}`
            }
          ]
        };

      case 'search_memory':
        const searchResult = await makeHttpRequest('tools/call', {
          name: 'search_memory',
          arguments: args
        });
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Search results for "${args.query}":\n\n${searchResult.content?.[0]?.text || 'No results found'}`
            }
          ]
        };

      case 'list_memories':
        const listResult = await makeHttpRequest('tools/call', {
          name: 'list_memories',
          arguments: args
        });
        return {
          content: [
            {
              type: 'text',
              text: `📋 Recent memories:\n\n${listResult.content?.[0]?.text || 'No memories found'}`
            }
          ]
        };

      case 'delete_memory':
        const deleteResult = await makeHttpRequest('tools/call', {
          name: 'delete_memory',
          arguments: args
        });
        return {
          content: [
            {
              type: 'text',
              text: `🗑️ Memory deleted successfully!\n\nMemory ID: ${args.memoryId}`
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🧠 Memory API MCP Server started for Claude Desktop');
}

main().catch(console.error);
