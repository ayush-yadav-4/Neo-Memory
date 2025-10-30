#!/usr/bin/env node

/**
 * MCP Stdio Bridge for Memory API
 * This bridge converts stdio MCP protocol to HTTP requests to your Memory API server
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:8787/mcp-server';
const API_KEY = process.env.API_KEY; // No fallback in repo
const SERVER_PATH = path.join(__dirname, 'server', 'start.ts');

// Start the HTTP server in the background
let serverProcess = null;

function startHttpServer() {
  console.error('🚀 Starting Memory API HTTP server...');
  
  serverProcess = spawn('npx', ['tsx', SERVER_PATH], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: '8787'
      // COHERE_API_KEY should be supplied via env
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.error('Server:', data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
  });

  serverProcess.on('close', (code) => {
    console.error(`Server exited with code ${code}`);
  });

  // Wait for server to start
  return new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
}

async function makeHttpRequest(data) {
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

async function handleMCPRequest(request) {
  try {
    const response = await makeHttpRequest(request);
    return response;
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error: ' + error.message
      }
    };
  }
}

async function main() {
  // Start the HTTP server
  await startHttpServer();
  
  console.error('✅ Memory API MCP Bridge ready');
  console.error('📡 Bridge: stdio ↔ HTTP');
  console.error('🔗 Target: http://localhost:8787/mcp-server');

  // Handle stdio communication
  let buffer = '';
  
  process.stdin.on('data', async (chunk) => {
    buffer += chunk.toString();
    
    // Process complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const request = JSON.parse(line);
          const response = await handleMCPRequest(request);
          process.stdout.write(JSON.stringify(response) + '\n');
        } catch (e) {
          // Invalid JSON, skip
        }
      }
    }
  });

  process.stdin.on('end', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}
