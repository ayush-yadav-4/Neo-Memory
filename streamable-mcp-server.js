#!/usr/bin/env node

/**
 * Streamable HTTP MCP Server for Chrome Extension
 * This creates a proper Streamable HTTP endpoint that the Chrome extension can use
 */

import http from 'http';
import { URL } from 'url';

const PORT = 8788; // Different port to avoid conflicts
const API_KEY = 'sk_mem_b906ee732a0d7de8116a06ac18b1d641f2f7ef733ad426805693c3cd871f0048';

// Your existing server URL
const BACKEND_URL = 'http://localhost:8787/mcp-server';

// Helper function to make requests to your backend
async function makeBackendRequest(method, params = {}) {
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
      path: '/mcp-server?api_key=' + encodeURIComponent(API_KEY),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': API_KEY
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

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url.pathname === '/mcp-stream') {
    // Handle Streamable HTTP MCP
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial server info
    const serverInfo = {
      jsonrpc: '2.0',
      method: 'server/info',
      params: {
        name: 'memory-api-streamable',
        version: '1.0.0',
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    };
    
    res.write(`data: ${JSON.stringify(serverInfo)}\n\n`);

    // Handle incoming messages
    let buffer = '';
    req.on('data', async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            console.log('📨 Received:', data.method || 'unknown');
            
            let response;
            switch (data.method) {
              case 'initialize':
                response = {
                  jsonrpc: '2.0',
                  id: data.id,
                  result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                      tools: {}
                    },
                    serverInfo: {
                      name: 'memory-api-streamable',
                      version: '1.0.0'
                    }
                  }
                };
                break;
                
              case 'tools/list':
                const toolsResult = await makeBackendRequest('tools/list', {});
                response = {
                  jsonrpc: '2.0',
                  id: data.id,
                  result: toolsResult
                };
                break;
                
              case 'tools/call':
                const callResult = await makeBackendRequest('tools/call', data.params);
                response = {
                  jsonrpc: '2.0',
                  id: data.id,
                  result: callResult
                };
                break;
                
              default:
                response = {
                  jsonrpc: '2.0',
                  id: data.id,
                  error: {
                    code: -32601,
                    message: `Method not found: ${data.method}`
                  }
                };
            }
            
            res.write(`data: ${JSON.stringify(response)}\n\n`);
            console.log('📤 Sent response');
            
          } catch (error) {
            console.error('❌ Error processing message:', error);
            const errorResponse = {
              jsonrpc: '2.0',
              id: data?.id || null,
              error: {
                code: -32603,
                message: error.message
              }
            };
            res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
          }
        }
      }
    });

    req.on('end', () => {
      console.log('📴 Connection ended');
      res.end();
    });

  } else {
    // Handle other requests
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Streamable MCP Server running on http://localhost:${PORT}`);
  console.log(`📡 Streamable endpoint: http://localhost:${PORT}/mcp-stream`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`\n📋 Chrome Extension Configuration:`);
  console.log(`Server URI: http://localhost:${PORT}/mcp-stream`);
  console.log(`API Key: ${API_KEY}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    process.exit(0);
  });
});
