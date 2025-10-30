#!/usr/bin/env node

/**
 * Memory API MCP Server - Standalone Version
 * This MCP server works with your project's API key system
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

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
console.log('🔑 Using project API key system');

// Start the server using tsx
const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '8787'
  }
});

// Wait for server to start, then get/create API key
setTimeout(async () => {
  try {
    console.log('🔑 Getting project API key...');
    
    // Try to get existing MCP API key
    const response = await fetch('http://localhost:8787/mcp-api-key');
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Using existing API key:', data.apiKey.substring(0, 8) + '...');
    } else {
      console.log('⚠️  No existing API key, creating new one...');
      
      // Create new test API key
      const createResponse = await fetch('http://localhost:8787/create-test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'MCP Claude Desktop Key' })
      });
      
      const createData = await createResponse.json();
      if (createData.success) {
        console.log('✅ Created new API key:', createData.apiKey.substring(0, 8) + '...');
      } else {
        console.log('❌ Failed to create API key:', createData.error);
      }
    }
    
    console.log('📋 MCP Server is ready!');
    console.log('💡 The server will auto-generate API keys as needed');
    
  } catch (error) {
    console.log('⚠️  Could not get API key (server may still be starting):', error.message);
    console.log('💡 The server will auto-generate API keys when needed');
  }
}, 3000);

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
