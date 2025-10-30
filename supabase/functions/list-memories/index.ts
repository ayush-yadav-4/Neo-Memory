import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSql } from "../_shared/db.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate with API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required in X-API-Key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify API key via Neon
    const sql = getSql();
    const rows = await sql`SELECT id, is_active FROM public.api_keys WHERE key = ${apiKey} LIMIT 1`;
    const keyData = rows[0];
    if (!keyData || !keyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get URL parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // List all memories for this API key
    const memories = await sql`
      SELECT id, content, metadata, created_at, updated_at
      FROM public.memories
      WHERE api_key_id = ${keyData.id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return new Response(
      JSON.stringify({
        success: true,
        count: memories?.length || 0,
        memories: memories || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
