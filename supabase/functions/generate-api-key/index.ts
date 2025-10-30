import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSql } from "../_shared/db.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const sql = getSql();

    const { userId, name, expiresInDays, rateLimit, scopes } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userId is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure API key
    const prefix = 'sk_mem_';
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const apiKey = `${prefix}${randomHex}`;

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && typeof expiresInDays === 'number') {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + expiresInDays);
      expiresAt = expireDate.toISOString();
    }

    // Store in database with enhanced fields
    const inserted = await sql`
      INSERT INTO public.api_keys (key, user_id, name, expires_at, rate_limit, scopes)
      VALUES (${apiKey}, ${userId}, ${name || 'Default Key'}, ${expiresAt}, ${rateLimit || 100}, ${sql.array(scopes || ['read','write'])})
      RETURNING id, name, user_id, expires_at, rate_limit, scopes, created_at
    `;
    const data = inserted?.[0];

    return new Response(
      JSON.stringify({
        success: true,
        apiKey: apiKey,
        id: data.id,
        name: data.name,
        userId: userId,
        expiresAt: data.expires_at,
        rateLimit: data.rate_limit,
        scopes: data.scopes,
        createdAt: data.created_at,
        message: 'Store this API key securely - it will not be shown again',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
