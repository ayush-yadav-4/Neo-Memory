/**
 * MCP (Model Context Protocol) Server for Memory API
 * 
 * This edge function acts as an MCP server that can be used by:
 * - Cursor IDE
 * - Claude Desktop
 * - Other MCP-compatible AI tools
 * 
 * It provides tools and resources for AI assistants to interact with the Memory API
 */

import { corsHeaders } from '../_shared/cors.ts';

interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required in X-API-Key header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const mcpRequest: MCPRequest = await req.json();
    let response: MCPResponse = {
      jsonrpc: '2.0',
      id: mcpRequest.id
    };

    switch (mcpRequest.method) {
      // Initialize MCP connection
      case 'initialize':
        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'memory-api-mcp',
            version: '1.0.0'
          }
        };
        break;

      // List available tools
      case 'tools/list':
        response.result = {
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
                    description: 'Max results (default: 5)',
                    default: 5
                  }
                },
                required: ['query']
              }
            },
            {
              name: 'list_memories',
              description: 'List recent memories in chronological order',
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
              description: 'Delete a specific memory by ID',
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
        break;

      // Execute a tool
      case 'tools/call':
        const toolName = mcpRequest.params?.name;
        const toolArgs = mcpRequest.params?.arguments || {};

        switch (toolName) {
          case 'store_memory':
            const storeResponse = await fetch(`${apiUrl}/functions/v1/store-memory`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
              },
              body: JSON.stringify({
                content: toolArgs.content,
                metadata: toolArgs.metadata
              })
            });

            const storeData = await storeResponse.json();
            
            if (!storeResponse.ok) {
              response.error = {
                code: -32000,
                message: storeData.error || 'Failed to store memory'
              };
            } else {
              response.result = {
                content: [
                  {
                    type: 'text',
                    text: `✓ Memory stored successfully\nID: ${storeData.memory.id}\nContent: ${toolArgs.content}`
                  }
                ]
              };
            }
            break;

          case 'search_memory':
            const searchResponse = await fetch(`${apiUrl}/functions/v1/retrieve-memories`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
              },
              body: JSON.stringify({
                query: toolArgs.query,
                limit: toolArgs.limit || 5
              })
            });

            const searchData = await searchResponse.json();
            
            if (!searchResponse.ok) {
              response.error = {
                code: -32000,
                message: searchData.error || 'Failed to search memories'
              };
            } else {
              const memories = searchData.memories || [];
              const resultsText = memories
                .map((m: any, i: number) => 
                  `${i + 1}. [Similarity: ${(m.similarity * 100).toFixed(1)}%]\n${m.content}\n`
                )
                .join('\n');

              response.result = {
                content: [
                  {
                    type: 'text',
                    text: `Found ${memories.length} relevant memories:\n\n${resultsText}`
                  }
                ]
              };
            }
            break;

          case 'list_memories':
            const listResponse = await fetch(
              `${apiUrl}/functions/v1/list-memories?limit=${toolArgs.limit || 20}`,
              {
                headers: {
                  'X-API-Key': apiKey
                }
              }
            );

            const listData = await listResponse.json();
            
            if (!listResponse.ok) {
              response.error = {
                code: -32000,
                message: listData.error || 'Failed to list memories'
              };
            } else {
              const memories = listData.memories || [];
              const listText = memories
                .map((m: any, i: number) => 
                  `${i + 1}. [${new Date(m.created_at).toLocaleDateString()}] ${m.content.substring(0, 100)}...`
                )
                .join('\n');

              response.result = {
                content: [
                  {
                    type: 'text',
                    text: `Recent memories (${memories.length}):\n\n${listText}`
                  }
                ]
              };
            }
            break;

          case 'delete_memory':
            const deleteResponse = await fetch(
              `${apiUrl}/functions/v1/delete-memory?memoryId=${toolArgs.memoryId}`,
              {
                method: 'DELETE',
                headers: {
                  'X-API-Key': apiKey
                }
              }
            );

            if (!deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              response.error = {
                code: -32000,
                message: deleteData.error || 'Failed to delete memory'
              };
            } else {
              response.result = {
                content: [
                  {
                    type: 'text',
                    text: `✓ Memory ${toolArgs.memoryId} deleted successfully`
                  }
                ]
              };
            }
            break;

          default:
            response.error = {
              code: -32601,
              message: `Unknown tool: ${toolName}`
            };
        }
        break;

      // List available resources
      case 'resources/list':
        response.result = {
          resources: [
            {
              uri: 'memory://recent',
              name: 'Recent Memories',
              description: 'Recently stored memories (last 50)',
              mimeType: 'application/json'
            },
            {
              uri: 'memory://all',
              name: 'All Memories',
              description: 'All stored memories',
              mimeType: 'application/json'
            }
          ]
        };
        break;

      // Read a resource
      case 'resources/read':
        const uri = mcpRequest.params?.uri;
        const limit = uri === 'memory://recent' ? 50 : 1000;

        const resourceResponse = await fetch(
          `${apiUrl}/functions/v1/list-memories?limit=${limit}`,
          {
            headers: {
              'X-API-Key': apiKey
            }
          }
        );

        const resourceData = await resourceResponse.json();
        
        if (!resourceResponse.ok) {
          response.error = {
            code: -32000,
            message: resourceData.error || 'Failed to read resource'
          };
        } else {
          response.result = {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify(resourceData.memories, null, 2)
              }
            ]
          };
        }
        break;

      default:
        response.error = {
          code: -32601,
          message: `Method not found: ${mcpRequest.method}`
        };
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in MCP server:', error);
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal server error'
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});