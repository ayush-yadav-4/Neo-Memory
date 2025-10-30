#!/usr/bin/env node

/**
 * Test script for Chrome Extension MCP connection
 */

import http from 'http';

const API_URL = 'http://localhost:8787/mcp-server';
const API_KEY = 'sk_mem_b906ee732a0d7de8116a06ac18b1d641f2f7ef733ad426805693c3cd871f0048';

async function testMCPConnection() {
  console.log('🧪 Testing MCP connection for Chrome Extension...\n');

  // Test 1: Initialize
  console.log('1️⃣ Testing initialize...');
  try {
    const initResult = await makeRequest('initialize', {});
    console.log('✅ Initialize successful:', initResult.serverInfo?.name);
  } catch (error) {
    console.log('❌ Initialize failed:', error.message);
    return;
  }

  // Test 2: List tools
  console.log('\n2️⃣ Testing tools/list...');
  try {
    const toolsResult = await makeRequest('tools/list', {});
    console.log('✅ Tools listed successfully:');
    toolsResult.tools?.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
  } catch (error) {
    console.log('❌ Tools list failed:', error.message);
  }

  // Test 3: Store memory
  console.log('\n3️⃣ Testing store_memory...');
  try {
    const storeResult = await makeRequest('tools/call', {
      name: 'store_memory',
      arguments: {
        content: 'Test memory from Chrome extension',
        metadata: { source: 'chrome-extension-test' }
      }
    });
    console.log('✅ Memory stored successfully');
  } catch (error) {
    console.log('❌ Store memory failed:', error.message);
  }

  // Test 4: Search memory
  console.log('\n4️⃣ Testing search_memory...');
  try {
    const searchResult = await makeRequest('tools/call', {
      name: 'search_memory',
      arguments: {
        query: 'test memory',
        limit: 3
      }
    });
    console.log('✅ Search successful');
  } catch (error) {
    console.log('❌ Search failed:', error.message);
  }

  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Chrome Extension Configuration:');
  console.log('Server URL: http://localhost:8787/mcp-server');
  console.log('API Key: sk_mem_b906ee732a0d7de8116a06ac18b1d641f2f7ef733ad426805693c3cd871f0048');
}

function makeRequest(method, params) {
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

testMCPConnection().catch(console.error);
