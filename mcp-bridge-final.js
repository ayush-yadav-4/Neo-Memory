#!/usr/bin/env node

/**
 * Final MCP Bridge for Memory API
 * This creates a stdio-based MCP server that communicates with your HTTP server
 */

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:8787/mcp-server';
const API_KEY = process.env.API_KEY || 'sk_mem_b906ee732a0d7de8116a06ac18b1d641f2f7ef733ad426805693c3cd871f0048';
const SERVER_PATH = path.join(__dirname, 'server', 'start.ts');

let serverProcess = null;
let isServerReady = false;

// Start the HTTP server
function startHttpServer() {
  console.error('🚀 Starting Memory API server...');
  
  // Try different ways to run the server
  const commands = [
    ['npx', 'tsx', `"${SERVER_PATH}"`],
    ['node', '--loader', 'tsx/esm', `"${SERVER_PATH}"`],
    ['tsx', `"${SERVER_PATH}"`]
  ];
  
  let commandIndex = 0;
  
  function tryStartServer() {
    if (commandIndex >= commands.length) {
      console.error('❌ Could not start server with any method');
      return Promise.reject(new Error('Could not start server'));
    }
    
    const [cmd, ...args] = commands[commandIndex];
    console.error(`Trying command: ${cmd} ${args.join(' ')}`);
    
    serverProcess = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: '8787'
      },
      shell: true
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.error('Server:', output);
      if (output.includes('listening on') || output.includes('API server')) {
        isServerReady = true;
        console.error('✅ Server is ready');
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server Error:', data.toString());
    });

    serverProcess.on('close', (code) => {
      console.error(`Server exited with code ${code}`);
      isServerReady = false;
    });

    serverProcess.on('error', (err) => {
      console.error(`Command failed: ${cmd}`, err.message);
      commandIndex++;
      if (commandIndex < commands.length) {
        setTimeout(tryStartServer, 1000);
      }
    });

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (isServerReady) {
          resolve();
        } else if (serverProcess && serverProcess.exitCode !== null) {
          reject(new Error('Server failed to start'));
        } else {
          setTimeout(checkReady, 1000);
        }
      };
      setTimeout(checkReady, 2000);
    });
  }
  
  return tryStartServer();
}

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
        'X-API-Key': API_KEY
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

// Handle MCP requests
async function handleMCPRequest(request) {
  if (!isServerReady) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Server not ready'
      }
    };
  }

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

// Main function
async function main() {
  try {
    // Start the HTTP server
    await startHttpServer();
    
    console.error('✅ MCP Bridge ready');
    console.error('📡 Bridge: stdio ↔ HTTP');
    console.error('🔗 Target: http://localhost:8787/mcp-server');

    // Handle stdio communication
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
            console.error('📨 Received request:', request.method || 'unknown');
            
            const response = await handleMCPRequest(request);
            console.error('📤 Sending response:', response.result ? 'success' : 'error');
            
            process.stdout.write(JSON.stringify(response) + '\n');
          } catch (e) {
            console.error('❌ Invalid JSON:', line);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      console.error('📴 Stdin ended');
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.error('🛑 SIGINT received');
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('🛑 SIGTERM received');
      if (serverProcess) {
        serverProcess.kill();
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Bridge startup error:', error);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);
