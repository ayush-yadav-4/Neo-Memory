#!/usr/bin/env node

/**
 * Test API Key validity
 */

import http from 'http';

const API_KEY = 'sk_mem_d478a10c1749e2c7c223028c9b48738f086b369d4a05c52bbe393b156281ded4';

function testApiKey() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
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

async function main() {
  console.log('🧪 Testing API key validity...');
  console.log('🔑 API Key:', API_KEY.substring(0, 8) + '...');
  
  try {
    const result = await testApiKey();
    console.log('✅ API key is valid!');
    console.log('📋 Available tools:', result.tools?.length || 0);
  } catch (error) {
    console.log('❌ API key is invalid:', error.message);
    console.log('💡 Try generating a new API key or check if the server is running');
  }
}

main().catch(console.error);
