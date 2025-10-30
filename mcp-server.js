#!/usr/bin/env node

/**
 * Memory API MCP Server
 * This is a standalone MCP server that can be run as a command for Claude Desktop
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Get the absolute path to the server
const serverPath = path.join(__dirname, 'server', 'start.ts');

// Check if the server file exists
if (!fs.existsSync(serverPath)) {
  console.error('❌ Server file not found:', serverPath);
  process.exit(1);
}

// Check if COHERE_API_KEY is set
if (!process.env.COHERE_API_KEY) {
  console.error('❌ COHERE_API_KEY environment variable is required');
  console.log('Please set it in your .env file or environment');
  process.exit(1);
}

console.log('🚀 Starting Memory API MCP Server...');
console.log('📡 Server will be available at: http://localhost:8787/mcp-server');
console.log('🔑 API Key will be auto-generated on first use');

// Start the server using tsx
const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '8787'
  }
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

// Handle server exit
server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP server...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down MCP server...');
  server.kill('SIGTERM');
  process.exit(0);
});

// Keep the process alive
process.stdin.resume();



