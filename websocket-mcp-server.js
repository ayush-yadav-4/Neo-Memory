#!/usr/bin/env node

/**
 * WebSocket MCP Server for Chrome Extension
 * This creates a WebSocket server that the Chrome extension can use
 */

import { WebSocketServer } from 'ws';
import http from 'http';
import { URL } from 'url';

const PORT = 8789; // Different port
const API_KEY = 'sk_mem_b906ee732a0d7de8116a06ac18b1d641f2f7ef733ad426805693c3cd871f0048';
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
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'WebSocket MCP Server', 
    websocket: `ws://localhost:${PORT}` 
  }));
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received:', message.method || 'unknown');
      
      let response;
      switch (message.method) {
        case 'initialize':
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'memory-api-websocket',
                version: '1.0.0'
              }
            }
          };
          break;
          
        case 'tools/list':
          const toolsResult = await makeBackendRequest('tools/list', {});
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: toolsResult
          };
          break;
          
        case 'tools/call':
          const callResult = await makeBackendRequest('tools/call', message.params);
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: callResult
          };
          break;
          
        default:
          response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32601,
              message: `Method not found: ${message.method}`
            }
          };
      }
      
      ws.send(JSON.stringify(response));
      console.log('📤 Sent response');
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      const errorResponse = {
        jsonrpc: '2.0',
        id: message?.id || null,
        error: {
          code: -32603,
          message: error.message
        }
      };
      ws.send(JSON.stringify(errorResponse));
    }
  });

  ws.on('close', () => {
    console.log('📴 WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket MCP Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`\n📋 Chrome Extension Configuration:`);
  console.log(`Server URI: ws://localhost:${PORT}`);
  console.log(`API Key: ${API_KEY}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    process.exit(0);
  });
});



