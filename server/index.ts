import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { neon } from '@neondatabase/serverless';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-api-key', 'x-supabase-authorization', 'cookie'],
  allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  credentials: true,
}));

// Database connection with retry
const sql = (() => {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('NEON_DATABASE_URL (or DATABASE_URL) is not set');

  // Create connection with timeout and retry settings
  return neon(url, {
    fetchOptions: {
      timeout: 30000, // 30 second timeout
    }
  });
})();

function setSessionCookie(c: any, token: string, maxAgeSec: number) {
  c.header('Set-Cookie', `session=${token}; Max-Age=${maxAgeSec}; HttpOnly; Path=/; SameSite=None; Secure`);
}

async function getUserFromSession(c: any) {
  try {
    const cookie = c.req.header('cookie') || '';
    const match = /(?:^|;\s*)session=([^;]+)/.exec(cookie);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const rows = await sql`SELECT s.*, u.email FROM public.sessions s JOIN public.users u ON u.id = s.user_id WHERE s.token = ${token} AND s.expires_at > NOW() LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('Database error in getUserFromSession:', error);
    return null;
  }
}

async function verifyApiKeyOwnership(apiKey: string, userId: string) {
  const keyRows = await sql`
    SELECT id, is_active, user_id 
    FROM public.api_keys 
    WHERE key = ${apiKey} AND user_id = ${userId} 
    LIMIT 1
  `;
  return keyRows[0] || null;
}

// Ensure required schema exists (idempotent)
async function ensureSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  // Create users table first (no dependencies)
  await sql`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Create sessions table (depends on users)
  await sql`
    CREATE TABLE IF NOT EXISTS public.sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Create api_keys table (depends on users)
  await sql`
    CREATE TABLE IF NOT EXISTS public.api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL UNIQUE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      name TEXT DEFAULT 'Default Key',
      expires_at TIMESTAMPTZ,
      rate_limit INTEGER DEFAULT 100,
      usage_count INTEGER DEFAULT 0,
      scopes TEXT[] DEFAULT ARRAY['read','write']
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id)`;
  
  // Update all existing API keys to be active
  await sql`UPDATE public.api_keys SET is_active = true WHERE is_active = false`;

  await sql`
    CREATE TABLE IF NOT EXISTS public.memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      embedding vector(1024),
      metadata JSONB,
      api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_memories_api_key_id ON public.memories(api_key_id)`;
  await sql`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_memories_embedding') THEN CREATE INDEX idx_memories_embedding ON public.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100); END IF; END $$`;
  await sql`CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS public.api_key_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_timestamp ON public.api_key_usage(api_key_id, timestamp DESC)`;
}

// Run schema check on startup (non-blocking log errors)
(async () => {
  try {
    await ensureSchema();
    console.log('DB schema ready');
  } catch (e) {
    console.error('Schema init failed:', e);
  }
})();

app.post('/generate-api-key', async (c) => {
  const session = await getUserFromSession(c);
  const userId = session?.user_id;
  const { name, expiresInDays, rateLimit, scopes } = await c.req.json();
  if (!userId) return c.json({ error: 'Not authenticated' }, 401);

  const prefix = 'sk_mem_';
  const random = crypto.getRandomValues(new Uint8Array(32));
  const randomHex = Array.from(random).map(b => b.toString(16).padStart(2,'0')).join('');
  const apiKey = `${prefix}${randomHex}`;

  let expiresAt: string | null = null;
  if (expiresInDays && typeof expiresInDays === 'number') {
    const d = new Date();
    d.setDate(d.getDate() + expiresInDays);
    expiresAt = d.toISOString();
  }

  const scopesArray = Array.isArray(scopes) ? scopes.map((s: any) => String(s)) : ['read','write'];
  const scopesLiteral = `{${scopesArray.map(s => s.replace(/"/g, '\\"')).join(',')}}`;
  const rows = await sql`
    INSERT INTO public.api_keys (key, user_id, name, expires_at, rate_limit, scopes)
    VALUES (${apiKey}, ${userId}, ${name || 'Default Key'}, ${expiresAt}, ${rateLimit || 100}, ${scopesLiteral}::text[])
    RETURNING id, name, user_id, expires_at, rate_limit, scopes, created_at
  `;
  const data = rows[0];
  return c.json({
    success: true,
    apiKey,
    id: data.id,
    name: data.name,
    userId: data.user_id,
    expiresAt: data.expires_at,
    rateLimit: data.rate_limit,
    scopes: data.scopes,
    createdAt: data.created_at,
    message: 'Store this API key securely - it will not be shown again'
  });
});

app.post('/store-memory', async (c) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey) return c.json({ error: 'X-API-Key required' }, 401);
  
  // Get user from session for additional security
  const session = await getUserFromSession(c);
  if (!session) return c.json({ error: 'Authentication required' }, 401);
  
  const key = await verifyApiKeyOwnership(apiKey, session.user_id);
  if (!key || !key.is_active) return c.json({ error: 'Invalid or inactive API key' }, 401);
  
  // Update usage count
  await sql`UPDATE public.api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ${key.id}`;

  const { content, metadata } = await c.req.json();
  if (!content || typeof content !== 'string') return c.json({ error: 'content required' }, 400);

  const cohereKey = process.env.COHERE_API_KEY;
  if (!cohereKey) return c.json({ error: 'Server missing COHERE_API_KEY' }, 500);

  const cohereResp = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cohereKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [content], model: 'embed-english-v3.0', input_type: 'search_document' })
  });
  if (!cohereResp.ok) return c.json({ error: 'Embedding failed' }, 500);
  const cohereData = await cohereResp.json();
  const embedding: number[] = cohereData.embeddings[0];

  const rows = await sql`
    INSERT INTO public.memories (content, embedding, metadata, api_key_id)
    VALUES (${content}, ${`[${embedding.join(',')}]`}::vector, ${metadata ? JSON.stringify(metadata) : null}::jsonb, ${key.id})
    RETURNING id, content, metadata, created_at
  `;
  const data = rows[0];
  return c.json({ success: true, memory: data });
});

app.post('/retrieve-memories', async (c) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey) return c.json({ error: 'X-API-Key required' }, 401);
  
  // Get user from session for additional security
  const session = await getUserFromSession(c);
  if (!session) return c.json({ error: 'Authentication required' }, 401);
  
  const key = await verifyApiKeyOwnership(apiKey, session.user_id);
  if (!key || !key.is_active) return c.json({ error: 'Invalid or inactive API key' }, 401);
  
  // Update usage count
  await sql`UPDATE public.api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ${key.id}`;

  const { query, limit = 5 } = await c.req.json();
  if (!query || typeof query !== 'string') return c.json({ error: 'query required' }, 400);

  const cohereKey = "Z6OW9Khqf4GsBCrWxHCJZWO3ww5lSPy11oWPGw8U";
  if (!cohereKey) return c.json({ error: 'Server missing COHERE_API_KEY' }, 500);

  const cohereResp = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cohereKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [query], model: 'embed-english-v3.0', input_type: 'search_query' })
  });
  if (!cohereResp.ok) return c.json({ error: 'Embedding failed' }, 500);
  const cohereData = await cohereResp.json();
  const queryEmbedding: number[] = cohereData.embeddings[0];
  const embeddingString = `[${queryEmbedding.join(',')}]`;

  const rows = await sql`
    SELECT id, content, metadata, created_at,
           1 - (embedding <=> ${embeddingString}::vector) AS similarity
    FROM public.memories
    WHERE api_key_id = ${key.id}
      AND 1 - (embedding <=> ${embeddingString}::vector) > 0.5
    ORDER BY embedding <=> ${embeddingString}::vector
    LIMIT ${limit}
  `;
  return c.json({ success: true, query, count: rows.length, memories: rows });
});

app.get('/list-memories', async (c) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey) return c.json({ error: 'X-API-Key required' }, 401);
  
  // Get user from session for additional security
  const session = await getUserFromSession(c);
  if (!session) return c.json({ error: 'Authentication required' }, 401);
  
  const key = await verifyApiKeyOwnership(apiKey, session.user_id);
  if (!key || !key.is_active) return c.json({ error: 'Invalid or inactive API key' }, 401);
  
  // Update usage count
  await sql`UPDATE public.api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ${key.id}`;

  const url = new URL(c.req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const rows = await sql`
    SELECT id, content, metadata, created_at, updated_at
    FROM public.memories
    WHERE api_key_id = ${key.id}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return c.json({ success: true, count: rows.length, memories: rows });
});

app.post('/delete-memory', async (c) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey) return c.json({ error: 'X-API-Key required' }, 401);
  
  // Get user from session for additional security
  const session = await getUserFromSession(c);
  if (!session) return c.json({ error: 'Authentication required' }, 401);
  
  const key = await verifyApiKeyOwnership(apiKey, session.user_id);
  if (!key || !key.is_active) return c.json({ error: 'Invalid or inactive API key' }, 401);
  
  // Update usage count
  await sql`UPDATE public.api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ${key.id}`;

  const { memoryId } = await c.req.json();
  if (!memoryId) return c.json({ error: 'memoryId required' }, 400);
  await sql`DELETE FROM public.memories WHERE id = ${memoryId} AND api_key_id = ${key.id}`;
  return c.json({ success: true, message: 'Memory deleted successfully' });
});

// Manage API Keys endpoints for UI compatibility
app.get('/manage-api-keys', async (c) => {
  const url = new URL(c.req.url);
  const action = url.searchParams.get('action');
  const session = await getUserFromSession(c);
  const userId = session?.user_id || '';
  const keyId = url.searchParams.get('keyId') || '';

  if (!userId) return c.json({ error: 'userId is required' }, 400);

  if (action === 'list') {
    const rows = await sql`
      SELECT id, key, name, is_active, expires_at, last_used_at, usage_count, rate_limit, scopes, created_at
      FROM public.api_keys
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    const masked = rows.map((k: any) => ({ ...k, key: `****${String(k.key).slice(-8)}` }));
    return c.json({ success: true, count: rows.length, keys: masked });
  }

  if (action === 'stats') {
    if (!keyId) return c.json({ error: 'keyId is required' }, 400);
    const keyRows = await sql`SELECT * FROM public.api_keys WHERE id = ${keyId} AND user_id = ${userId} LIMIT 1`;
    const key = keyRows[0];
    if (!key) return c.json({ error: 'API key not found' }, 404);

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const logs = await sql`SELECT status_code FROM public.api_key_usage WHERE api_key_id = ${keyId} AND timestamp >= ${last24h.toISOString()}`;
    const errorCount = logs.filter((l: any) => Number(l.status_code) >= 400).length;
    const errorRate = logs.length > 0 ? ((errorCount / logs.length) * 100).toFixed(2) + '%' : '0.00%';

    return c.json({
      success: true,
      stats: {
        totalRequests: key.usage_count,
        last24hRequests: logs.length,
        errorRate,
        lastUsed: key.last_used_at,
        isActive: key.is_active,
        rateLimit: key.rate_limit,
        expiresAt: key.expires_at,
      }
    });
  }

  return c.json({ error: 'Invalid action' }, 400);
});

app.post('/manage-api-keys', async (c) => {
  const body = await c.req.json();
  const action = body?.action;
  const session = await getUserFromSession(c);
  const userId = session?.user_id as string;
  const keyId = body?.keyId as string;
  if (!userId) return c.json({ error: 'userId is required' }, 400);

  if (action === 'rotate') {
    if (!keyId) return c.json({ error: 'keyId is required' }, 400);
    const oldRows = await sql`SELECT * FROM public.api_keys WHERE id = ${keyId} AND user_id = ${userId} LIMIT 1`;
    const oldKey = oldRows[0];
    if (!oldKey) return c.json({ error: 'API key not found or unauthorized' }, 404);

    const prefix = 'sk_mem_';
    const random = crypto.getRandomValues(new Uint8Array(32));
    const randomHex = Array.from(random).map(b => b.toString(16).padStart(2,'0')).join('');
    const newApiKey = `${prefix}${randomHex}`;

    const created = await sql`
      INSERT INTO public.api_keys (key, user_id, name, is_active, expires_at, rate_limit, scopes)
      VALUES (${newApiKey}, ${userId}, ${String(oldKey.name) + ' (Rotated)'}, true, ${oldKey.expires_at}, ${oldKey.rate_limit}, ${'{'+(oldKey.scopes||[]).join(',')+'}'}::text[])
      RETURNING id, name, expires_at, rate_limit, scopes
    `;
    await sql`UPDATE public.api_keys SET is_active = false WHERE id = ${keyId}`;
    const nk = created[0];
    return c.json({
      success: true,
      message: 'API key rotated successfully',
      newKey: { id: nk.id, key: newApiKey, name: nk.name, expiresAt: nk.expires_at, rateLimit: nk.rate_limit, scopes: nk.scopes }
    });
  }

  return c.json({ error: 'Invalid action' }, 400);
});

app.delete('/manage-api-keys', async (c) => {
  const url = new URL(c.req.url);
  const session = await getUserFromSession(c);
  const userId = session?.user_id || '';
  const keyId = url.searchParams.get('keyId') || '';
  if (!userId || !keyId) return c.json({ error: 'userId and keyId are required' }, 400);
  const owned = await sql`SELECT id FROM public.api_keys WHERE id = ${keyId} AND user_id = ${userId} LIMIT 1`;
  if (!owned[0]) return c.json({ error: 'API key not found or unauthorized' }, 404);
  await sql`DELETE FROM public.api_keys WHERE id = ${keyId}`;
  return c.json({ success: true });
});

// Streamable HTTP MCP endpoint for Chrome Extension
app.get('/mcp-stream', async (c) => {
  const apiKey = c.req.header('x-api-key') || c.req.query('api_key');
  
  if (!apiKey) {
    return c.json({ error: 'API key required' }, 401);
  }

  // Set up Server-Sent Events headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', 'Cache-Control');

  // Send initial connection event
  const stream = new ReadableStream({
    start(controller) {
      // Send server info
      const serverInfo = {
        jsonrpc: '2.0',
        method: 'server/info',
        params: {
          name: 'memory-api',
          version: '1.0.0',
          capabilities: {
            tools: {},
            resources: {}
          }
        }
      };
      
      controller.enqueue(`data: ${JSON.stringify(serverInfo)}\n\n`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
});

// MCP Server endpoint (JSON-RPC over HTTP)
// Get or create a default API key for MCP usage
app.get('/mcp-api-key', async (c) => {
  try {
    // Look for existing MCP API key
    let key = await sql`SELECT key, name, expires_at FROM public.api_keys WHERE name LIKE '%MCP%' AND is_active = true ORDER BY created_at DESC LIMIT 1`;
    
    if (!key[0]) {
      // Create a test user first
      const testEmail = 'mcp-auto@example.com';
      const testPassword = 'mcp123';
      const passwordHash = Buffer.from(testPassword).toString('base64');
      
      // Check if test user exists, if not create one
      let user = await sql`SELECT id FROM public.users WHERE email = ${testEmail} LIMIT 1`;
      if (!user[0]) {
        const newUser = await sql`
          INSERT INTO public.users (email, password_hash)
          VALUES (${testEmail}, ${passwordHash})
          RETURNING id
        `;
        user = newUser;
      }
      
      // Generate API key
      const newApiKey = `mcp_${crypto.randomUUID().replace(/-/g, '')}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const keyData = await sql`
        INSERT INTO public.api_keys (key, user_id, name, expires_at, rate_limit, scopes)
        VALUES (${newApiKey}, ${user[0].id}, 'MCP Auto Key', ${expiresAt.toISOString()}, 1000, ARRAY['read','write'])
        RETURNING key, name, expires_at
      `;
      
      key = keyData;
    }
    
    return c.json({
      success: true,
      apiKey: key[0].key,
      name: key[0].name,
      expiresAt: key[0].expires_at,
      message: 'Use this API key in your MCP configuration'
    });
  } catch (error) {
    console.error('Error getting MCP API key:', error);
    return c.json({ error: 'Failed to get MCP API key: ' + (error as Error).message }, 500);
  }
});

// Create a test API key for MCP usage (no authentication required)
app.post('/create-test-api-key', async (c) => {
  try {
    const { name = 'MCP Test Key' } = await c.req.json().catch(() => ({}));
    
    // Create a test user first
    const testEmail = 'mcp-test@example.com';
    const testPassword = 'test123';
    const passwordHash = Buffer.from(testPassword).toString('base64'); // Simple encoding for test
    
    // Check if test user exists, if not create one
    let user = await sql`SELECT id FROM public.users WHERE email = ${testEmail} LIMIT 1`;
    if (!user[0]) {
      const newUser = await sql`
        INSERT INTO public.users (email, password_hash)
        VALUES (${testEmail}, ${passwordHash})
        RETURNING id
      `;
      user = newUser;
    }
    
    // Generate API key
    const apiKey = `mcp_${crypto.randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry
    
    const keyData = await sql`
      INSERT INTO public.api_keys (key, user_id, name, expires_at, rate_limit, scopes)
      VALUES (${apiKey}, ${user[0].id}, ${name}, ${expiresAt.toISOString()}, 1000, ARRAY['read','write'])
      RETURNING id, name, expires_at, created_at
    `;
    
    return c.json({
      success: true,
      apiKey,
      keyId: keyData[0].id,
      name: keyData[0].name,
      expiresAt: keyData[0].expires_at,
      message: 'Test API key created successfully for MCP usage'
    });
  } catch (error) {
    console.error('Error creating test API key:', error);
    return c.json({ error: 'Failed to create test API key: ' + (error as Error).message }, 500);
  }
});

// Store the auto-created API key globally to reuse it
let globalMCPApiKey: string | null = null;

app.post('/mcp-server', async (c) => {
  if (c.req.method === 'OPTIONS') return c.text('ok');

  const clientInfo = c.req.header('user-agent') || 'Unknown Client';
  console.log(`[MCP] Connection attempt from: ${clientInfo}`);

  let apiKey = c.req.header('x-api-key');
  
  // Also check for API key in query parameters
  if (!apiKey) {
    const url = new URL(c.req.url);
    apiKey = url.searchParams.get('api_key') || url.searchParams.get('apikey');
  }
  
  if (!apiKey) {
    // If no API key provided, reuse existing one or create one
    if (globalMCPApiKey) {
      apiKey = globalMCPApiKey;
      console.log('[MCP] Reusing existing API key:', apiKey.substring(0, 8) + '...');
    } else {
      console.log('[MCP] No API key provided, creating one automatically');
      
      // Create a test user first
      const testEmail = 'mcp-auto@example.com';
      const testPassword = 'mcp123';
      const passwordHash = Buffer.from(testPassword).toString('base64');
      
      // Check if test user exists, if not create one
      let user = await sql`SELECT id FROM public.users WHERE email = ${testEmail} LIMIT 1`;
      if (!user[0]) {
        const newUser = await sql`
          INSERT INTO public.users (email, password_hash)
          VALUES (${testEmail}, ${passwordHash})
          RETURNING id
        `;
        user = newUser;
      }
      
      // Generate API key
      const newApiKey = `mcp_${crypto.randomUUID().replace(/-/g, '')}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      const keyData = await sql`
        INSERT INTO public.api_keys (key, user_id, name, expires_at, rate_limit, scopes)
        VALUES (${newApiKey}, ${user[0].id}, 'MCP Auto Key', ${expiresAt.toISOString()}, 1000, ARRAY['read','write'])
        RETURNING key
      `;
      
      apiKey = keyData[0].key;
      globalMCPApiKey = apiKey; // Store for reuse
      console.log('[MCP] Created new API key:', apiKey.substring(0, 8) + '...');
    }
    
    console.log(`[MCP] Connection established with client: ${clientInfo}`);
  }

  const apiBase = `${new URL(c.req.url).origin}`.replace(/\/$/, '');
  const body = await c.req.json().catch(() => ({}));
  const id = body?.id ?? null;
  const method = body?.method as string;
  const params = body?.params || {};

  const json = (result: any, error?: { code: number; message: string }) =>
    c.json({ jsonrpc: '2.0', id, ...(error ? { error } : { result }) });

  try {
    console.log('[MCP]', { method, params });
    switch (method) {
      case 'initialize':
        return json({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'memory-api-mcp-node', version: '1.0.0' }
        });

      case 'tools/list':
        return json({
          tools: [
            {
              name: 'store_memory',
              description: 'Store a new memory with optional metadata.',
              inputSchema: {
                type: 'object',
                properties: {
                  content: { type: 'string', description: 'The content to remember' },
                  metadata: { type: 'object', description: 'Optional metadata' }
                },
                required: ['content']
              }
            },
            {
              name: 'search_memory',
              description: 'Search memories using semantic similarity',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  limit: { type: 'number', default: 5 }
                },
                required: ['query']
              }
            },
            {
              name: 'list_memories',
              description: 'List recent memories',
              inputSchema: {
                type: 'object',
                properties: { limit: { type: 'number', default: 20 } }
              }
            },
            {
              name: 'delete_memory',
              description: 'Delete a memory by ID',
              inputSchema: {
                type: 'object',
                properties: { memoryId: { type: 'string' } },
                required: ['memoryId']
              }
            }
          ]
        });

      case 'tools/call': {
        const toolName = params?.name as string;
        const args = params?.arguments || {};

        if (toolName === 'store_memory') {
          try {
            console.log('[MCP] store_memory - API Key received:', apiKey ? `${apiKey.substring(0, 8)}...` : 'none');
            
            // Direct API key authentication for MCP
            let key = await sql`SELECT id, is_active, user_id FROM public.api_keys WHERE key = ${apiKey} AND is_active = true LIMIT 1`;
            console.log('[MCP] store_memory - Key lookup result:', key.length > 0 ? 'found' : 'not found');
            
            if (!key[0]) {
              // If no API key provided or not found, create a default one for MCP
              if (!apiKey || apiKey === 'default' || apiKey === 'mcp') {
                console.log('[MCP] Creating default API key for MCP usage');
                
                // Create a test user first
                const testEmail = 'mcp-auto@example.com';
                const testPassword = 'mcp123';
                const passwordHash = Buffer.from(testPassword).toString('base64');
                
                // Check if test user exists, if not create one
                let user = await sql`SELECT id FROM public.users WHERE email = ${testEmail} LIMIT 1`;
                if (!user[0]) {
                  const newUser = await sql`
                    INSERT INTO public.users (email, password_hash)
                    VALUES (${testEmail}, ${passwordHash})
                    RETURNING id
                  `;
                  user = newUser;
                }
                
                // Generate API key
                const newApiKey = `mcp_${crypto.randomUUID().replace(/-/g, '')}`;
                const expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                
                const keyData = await sql`
                  INSERT INTO public.api_keys (key, user_id, name, expires_at, rate_limit, scopes)
                  VALUES (${newApiKey}, ${user[0].id}, 'MCP Auto Key', ${expiresAt.toISOString()}, 1000, ARRAY['read','write'])
                  RETURNING id, is_active, user_id
                `;
                
                key = keyData;
                console.log('[MCP] Created new API key:', newApiKey.substring(0, 8) + '...');
              } else {
                // Let's check if the key exists but is inactive
                const inactiveKey = await sql`SELECT id, is_active FROM public.api_keys WHERE key = ${apiKey} LIMIT 1`;
                if (inactiveKey[0]) {
                  return json(null, { code: -32000, message: 'API key is inactive' });
                }
                return json(null, { code: -32000, message: 'Invalid API key' });
              }
            }

          // Generate embedding
          const cohereResp = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              texts: [args.content],
              model: 'embed-english-v3.0',
              input_type: 'search_document'
            })
          });
          if (!cohereResp.ok) {
            return json(null, { code: -32000, message: 'Embedding failed' });
          }
          const cohereData = await cohereResp.json();
          const embedding: number[] = cohereData.embeddings[0];

          // Store memory directly
          const rows = await sql`
            INSERT INTO public.memories (content, embedding, metadata, api_key_id)
            VALUES (${args.content}, ${`[${embedding.join(',')}]`}::vector, ${args.metadata ? JSON.stringify(args.metadata) : null}::jsonb, ${key[0].id})
            RETURNING id, content, metadata, created_at
          `;
          
          return json({ content: [{ type: 'text', text: `✓ Memory stored: ${args.content}` }] });
          } catch (error) {
            console.error('[MCP] store_memory error:', error);
            return json(null, { code: -32000, message: 'Database error: ' + (error as Error).message });
          }
        }

        if (toolName === 'search_memory') {
          try {
            console.log('[MCP] search_memory - API Key received:', apiKey ? `${apiKey.substring(0, 8)}...` : 'none');
            
            // Direct API key authentication for MCP
            const key = await sql`SELECT id, is_active, user_id FROM public.api_keys WHERE key = ${apiKey} AND is_active = true LIMIT 1`;
            console.log('[MCP] search_memory - Key lookup result:', key.length > 0 ? 'found' : 'not found');
            
            if (!key[0]) {
              return json(null, { code: -32000, message: 'Invalid API key' });
            }

          // Generate query embedding
          const cohereResp = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              texts: [args.query],
              model: 'embed-english-v3.0',
              input_type: 'search_query'
            })
          });
          if (!cohereResp.ok) {
            return json(null, { code: -32000, message: 'Embedding failed' });
          }
          const cohereData = await cohereResp.json();
          const queryEmbedding: number[] = cohereData.embeddings[0];

          // Search memories directly
          const memories = await sql`
            SELECT id, content, metadata, created_at,
                   (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) as distance
            FROM public.memories
            WHERE api_key_id = ${key[0].id}
            ORDER BY distance
            LIMIT ${args.limit || 5}
          `;
          
          const results = memories.map((m: any, i: number) => `${i + 1}. [${((1 - m.distance) * 100).toFixed(1)}%] ${m.content}`).join('\n');
          return json({ content: [{ type: 'text', text: results || 'No results' }] });
          } catch (error) {
            console.error('[MCP] search_memory error:', error);
            return json(null, { code: -32000, message: 'Database error: ' + (error as Error).message });
          }
        }

        if (toolName === 'list_memories') {
          try {
            console.log('[MCP] list_memories - API Key received:', apiKey ? `${apiKey.substring(0, 8)}...` : 'none');
            
            // Direct API key authentication for MCP
            const key = await sql`SELECT id, is_active, user_id FROM public.api_keys WHERE key = ${apiKey} AND is_active = true LIMIT 1`;
            console.log('[MCP] list_memories - Key lookup result:', key.length > 0 ? 'found' : 'not found');
            
            if (!key[0]) {
              return json(null, { code: -32000, message: 'Invalid API key' });
            }

          // List memories directly
          const memories = await sql`
            SELECT id, content, metadata, created_at
            FROM public.memories
            WHERE api_key_id = ${key[0].id}
            ORDER BY created_at DESC
            LIMIT ${args.limit || 20}
          `;
          
          const list = memories.map((m: any, i: number) => `${i + 1}. [${new Date(m.created_at).toLocaleDateString()}] ${m.content}`).join('\n');
          return json({ content: [{ type: 'text', text: list || 'No memories' }] });
          } catch (error) {
            console.error('[MCP] list_memories error:', error);
            return json(null, { code: -32000, message: 'Database error: ' + (error as Error).message });
          }
        }

        if (toolName === 'delete_memory') {
          try {
            console.log('[MCP] delete_memory - API Key received:', apiKey ? `${apiKey.substring(0, 8)}...` : 'none');
            
            // Direct API key authentication for MCP
            const key = await sql`SELECT id, is_active, user_id FROM public.api_keys WHERE key = ${apiKey} AND is_active = true LIMIT 1`;
            console.log('[MCP] delete_memory - Key lookup result:', key.length > 0 ? 'found' : 'not found');
            
            if (!key[0]) {
              return json(null, { code: -32000, message: 'Invalid API key' });
            }

            // Delete memory directly
            await sql`DELETE FROM public.memories WHERE id = ${args.memoryId} AND api_key_id = ${key[0].id}`;
            return json({ content: [{ type: 'text', text: `✓ Memory ${args.memoryId} deleted` }] });
          } catch (error) {
            console.error('[MCP] delete_memory error:', error);
            return json(null, { code: -32000, message: 'Database error: ' + (error as Error).message });
          }
        }

        return json(null, { code: -32601, message: `Unknown tool: ${toolName}` });
      }

      case 'resources/list':
        return json({
          resources: [
            { uri: 'memory://recent', name: 'Recent Memories', description: 'Last 50 memories', mimeType: 'application/json' },
            { uri: 'memory://all', name: 'All Memories', description: 'Up to 1000 memories', mimeType: 'application/json' }
          ]
        });

      case 'resources/read': {
        const uri = params?.uri as string;
        const limit = uri === 'memory://recent' ? 50 : 1000;
        const resp = await fetch(`${apiBase}/list-memories?limit=${limit}`, { headers: { 'X-API-Key': apiKey } });
        const data = await resp.json();
        if (!resp.ok) return json(null, { code: -32000, message: data.error || 'Failed to read resource' });
        return json({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data.memories || [], null, 2) }] });
      }

      default:
        return json(null, { code: -32601, message: `Method not found: ${method}` });
    }
  } catch (e: any) {
    return json(null, { code: -32603, message: e?.message || 'Internal error' });
  }
});

// Auth: signup, login, me, logout
app.post('/auth/signup', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(saltHex + password));
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  const password_hash = `${saltHex}:${hashHex}`;
  try {
    const rows = await sql`INSERT INTO public.users (email, password_hash) VALUES (${email}, ${password_hash}) RETURNING id`;
    const user = rows[0];
    const token = crypto.randomUUID().replace(/-/g, '');
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await sql`INSERT INTO public.sessions (user_id, token, expires_at) VALUES (${user.id}, ${token}, ${expires.toISOString()})`;
    setSessionCookie(c, token, 3 * 24 * 60 * 60);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e?.message || 'signup failed' }, 500);
  }
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);
  const rows = await sql`SELECT * FROM public.users WHERE email = ${email} LIMIT 1`;
  const user = rows[0];
  if (!user) return c.json({ error: 'invalid credentials' }, 401);
  const [saltHex, storedHex] = String(user.password_hash).split(':');
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(saltHex + password));
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  if (hashHex !== storedHex) return c.json({ error: 'invalid credentials' }, 401);
  const token = crypto.randomUUID().replace(/-/g, '');
  const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await sql`INSERT INTO public.sessions (user_id, token, expires_at) VALUES (${user.id}, ${token}, ${expires.toISOString()})`;
  setSessionCookie(c, token, 3 * 24 * 60 * 60);
  return c.json({ success: true });
});

app.get('/auth/me', async (c) => {
  const session = await getUserFromSession(c);
  if (!session) return c.json({ authenticated: false }, 200);
  return c.json({ authenticated: true, user: { id: session.user_id, email: session.email }, expiresAt: session.expires_at });
});

app.post('/auth/logout', async (c) => {
  const cookie = c.req.header('cookie') || '';
  const match = /(?:^|;\s*)session=([^;]+)/.exec(cookie);
  if (match) {
    const token = decodeURIComponent(match[1]);
    await sql`DELETE FROM public.sessions WHERE token = ${token}`;
  }
  c.header('Set-Cookie', `session=; Max-Age=0; HttpOnly; Path=/; SameSite=None; Secure`);
  return c.json({ success: true });
});

export default app;


