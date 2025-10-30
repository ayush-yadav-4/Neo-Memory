#!/usr/bin/env node

/**
 * 5ire AI MCP Bridge
 * This creates a robust STDIO-based MCP server for 5ire AI
 */

import http from 'http';

// Configuration
const API_URL = 'http://localhost:8787/mcp-server';
const API_KEY = process.env.API_KEY; // No hardcoded fallback

// Helper function to make HTTP requests
function makeHttpRequest(method, params = {}) {
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
      },
      timeout: 10000 // 10 second timeout
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
      reject(new Error('Connection error: ' + err.message));
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Handle MCP requests
async function handleMCPRequest(request) {
  const { method, params, id } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'memory-api-5ire',
              version: '1.0.0'
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'store_memory',
                description: 'Store a new memory with optional metadata',
                inputSchema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'string',
                      description: 'The content to remember'
                    },
                    metadata: {
                      type: 'object',
                      description: 'Optional metadata'
                    }
                  },
                  required: ['content']
                }
              },
              {
                name: 'search_memory',
                description: 'Search memories using semantic similarity',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'What to search for'
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum results (default: 5)',
                      default: 5
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: 'list_memories',
                description: 'List recent memories',
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: {
                      type: 'number',
                      description: 'Number of memories (default: 20)',
                      default: 20
                    }
                  }
                }
              },
              {
                name: 'delete_memory',
                description: 'Delete a memory by ID',
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
          }
        };

      case 'tools/call':
        const { name, arguments: args } = params;
        
        switch (name) {
          case 'store_memory':
            const storeResult = await makeHttpRequest('tools/call', {
              name: 'store_memory',
              arguments: args
            });
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `✅ Memory stored: ${args.content}`
                  }
                ]
              }
            };

          case 'search_memory':
            const searchResult = await makeHttpRequest('tools/call', {
              name: 'search_memory',
              arguments: args
            });
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `🔍 Search results for "${args.query}":\n\n${searchResult.content?.[0]?.text || 'No results found'}`
                  }
                ]
              }
            };

          case 'list_memories':
            const listResult = await makeHttpRequest('tools/call', {
              name: 'list_memories',
              arguments: args
            });
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `📋 Recent memories:\n\n${listResult.content?.[0]?.text || 'No memories found'}`
                  }
                ]
              }
            };

          case 'delete_memory':
            const deleteResult = await makeHttpRequest('tools/call', {
              name: 'delete_memory',
              arguments: args
            });
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `🗑️ Memory deleted: ${args.memoryId}`
                  }
                ]
              }
            };

          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`
              }
            };
        }

      case 'notifications/initialized':
        return {
          jsonrpc: '2.0',
          id,
          result: {}
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message
      }
    };
  }
}

// Main function
async function main() {
  console.error('🧠 Memory API MCP Bridge starting for 5ire AI...');
  console.error('📡 Connecting to: http://localhost:8787/mcp-server');
  
  let buffer = '';
  
  process.stdin.on('data', async (chunk) => {
    buffer += chunk.toString();
    
    // Process complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const request = JSON.parse(line);
          console.error('📨 Received:', request.method || 'unknown');
          
          const response = await handleMCPRequest(request);
          console.error('📤 Sending response');
          
          process.stdout.write(JSON.stringify(response) + '\n');
        } catch (e) {
          console.error('❌ Invalid JSON:', line);
        }
      }
    }
  });

  process.stdin.on('end', () => {
    console.error('📴 Stdin ended');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.error('🛑 SIGINT received');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('🛑 SIGTERM received');
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

main().catch(console.error);
