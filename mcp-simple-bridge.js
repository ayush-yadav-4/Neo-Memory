#!/usr/bin/env node

/**
 * Simple MCP Bridge - connects to existing HTTP server
 */

import http from 'http';

// Configuration
const API_URL = 'http://localhost:8787/mcp-server';
const API_KEY = process.env.API_KEY; // No fallback in repo
const COHERE_API_KEY = process.env.COHERE_API_KEY; // No fallback in repo

console.error('🔗 MCP Bridge connecting to existing server...');
console.error('📡 Target: http://localhost:8787/mcp-server');

// Make HTTP request to the server
function makeHttpRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: '/mcp-server',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {})
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve(jsonResponse);
        } catch (e) {
          resolve({
            jsonrpc: '2.0',
            id: data.id,
            error: {
              code: -32700,
              message: 'Parse error: ' + responseData
            }
          });
        }
      });
    });

    req.on('error', (err) => {
      console.error('HTTP Request Error:', err);
      resolve({
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: 'Connection error: ' + err.message
        }
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: 'Request timeout'
        }
      });
    });

    req.write(postData);
    req.end();
  });
}

// Read STDIN line by line and proxy to HTTP server
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.substring(0, newlineIndex).trim();
    buffer = buffer.substring(newlineIndex + 1);

    if (!line) continue;

    let request;
    try {
      request = JSON.parse(line);
    } catch (e) {
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
      continue;
    }

    const response = await makeHttpRequest(request);
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});
