import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateApiKey, logApiUsage, hasScope } from '../_shared/auth.ts';
import { corsHeaders } from "../_shared/cors.ts";
import { getSql } from "../_shared/db.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cohereApiKey = Deno.env.get('COHERE_API_KEY')!;

    if (!cohereApiKey) {
      return new Response(
        JSON.stringify({ error: 'Cohere API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate with API key and check rate limits
    const authResult = await authenticateApiKey(req.headers.get('x-api-key'));
    
    if (authResult.error) {
      await logApiUsage(authResult.apiKeyId || '', '/retrieve-memories', 'POST', authResult.statusCode || 401);
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check read scope
    if (!hasScope(authResult.apiKey, 'read')) {
      await logApiUsage(authResult.apiKeyId, '/retrieve-memories', 'POST', 403);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Read scope required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { query, limit = 5 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate query embedding using Cohere API
    const cohereResponse = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [query],
        model: 'embed-english-v3.0',
        input_type: 'search_query',
      }),
    });

    if (!cohereResponse.ok) {
      const error = await cohereResponse.text();
      console.error('Cohere API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate query embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cohereData = await cohereResponse.json();
    const queryEmbedding = cohereData.embeddings[0];
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    const sql = getSql();
    const memories = await sql`
      SELECT id, content, metadata, created_at,
             1 - (embedding <=> ${embeddingString}::vector) AS similarity
      FROM public.memories
      WHERE api_key_id = ${authResult.apiKeyId}
        AND 1 - (embedding <=> ${embeddingString}::vector) > 0.5
      ORDER BY embedding <=> ${embeddingString}::vector
      LIMIT ${limit}
    `;

    await logApiUsage(authResult.apiKeyId, '/retrieve-memories', 'POST', 200);
    return new Response(
      JSON.stringify({
        success: true,
        query,
        count: memories?.length || 0,
        memories: memories || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
