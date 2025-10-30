#!/usr/bin/env node

/**
 * MCP Server Startup Script
 * This script starts the MCP server and provides instructions for Claude Desktop configuration
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Starting Memory API MCP Server...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found. Creating from .env.example...');
  const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
  fs.writeFileSync(envPath, envExample);
  console.log('📝 Please edit .env file and add your COHERE_API_KEY\n');
}

// Start the server
const server = spawn('npm', ['run', 'server:dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n🛑 Server exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Server is starting on http://localhost:8787');
console.log('📋 Next steps:');
console.log('1. Get your API key: curl http://localhost:8787/mcp-api-key');
console.log('2. Configure Claude Desktop (see CLAUDE_SETUP.md)');
console.log('3. Test the connection\n');
