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
      await logApiUsage(authResult.apiKeyId || '', '/store-memory', 'POST', authResult.statusCode || 401);
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check write scope
    if (!hasScope(authResult.apiKey, 'write')) {
      await logApiUsage(authResult.apiKeyId, '/store-memory', 'POST', 403);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Write scope required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { content, metadata } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding using Cohere API
    const cohereResponse = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [content],
        model: 'embed-english-v3.0',
        input_type: 'search_document',
      }),
    });

    if (!cohereResponse.ok) {
      const error = await cohereResponse.text();
      console.error('Cohere API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cohereData = await cohereResponse.json();
    const embedding = cohereData.embeddings[0];

    const sql = getSql();
    const inserted = await sql`
      INSERT INTO public.memories (content, embedding, metadata, api_key_id)
      VALUES (${content}, ${`[${embedding.join(',')}]`}::vector, ${metadata ? sql.json(metadata) : null}, ${authResult.apiKeyId})
      RETURNING id, content, metadata, created_at
    `;
    const data = inserted?.[0];

    await logApiUsage(authResult.apiKeyId, '/store-memory', 'POST', 200);
    return new Response(
      JSON.stringify({
        success: true,
        memory: {
          id: data.id,
          content: data.content,
          metadata: data.metadata,
          createdAt: data.created_at,
        },
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
