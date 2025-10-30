#!/usr/bin/env node

/**
 * Test the Simple MCP Bridge
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Simple MCP Bridge...');

const bridgePath = path.join(__dirname, 'mcp-simple-bridge.js');

const bridge = spawn('node', [bridgePath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    API_KEY: 'sk_mem_b906ee732a0d7de8116a06ac18b1d641f2f7ef733ad426805693c3cd871f0048'
  }
});

bridge.stderr.on('data', (data) => {
  console.log('Bridge:', data.toString());
});

bridge.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

// Send initialize request
setTimeout(() => {
  console.log('📤 Sending initialize request...');
  bridge.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  }) + '\n');
}, 1000);

// Send tools/list request
setTimeout(() => {
  console.log('📤 Sending tools/list request...');
  bridge.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  }) + '\n');
}, 3000);

// Close after test
setTimeout(() => {
  console.log('✅ Test complete');
  bridge.kill();
  process.exit(0);
}, 8000);

bridge.on('close', (code) => {
  console.log(`Bridge exited with code ${code}`);
  process.exit(code);
});
