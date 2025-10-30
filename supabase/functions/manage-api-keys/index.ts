import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    // LIST: Get all API keys for a user
    if (req.method === 'GET' && action === 'list') {
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: keys, error } = await supabaseAdmin
        .from('api_keys')
        .select('id, key, name, is_active, expires_at, last_used_at, usage_count, rate_limit, scopes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing API keys:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to list API keys' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return full keys instead
      // Forcibly attach a timestamp (for cache-busting in debugging)
      return new Response(
        JSON.stringify({ success: true, count: keys.length, keys, ts: Date.now() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // ROTATE: Generate new key and deactivate old one
    if (req.method === 'POST' && action === 'rotate') {
      const { userId, keyId } = await req.json();
      
      if (!userId || !keyId) {
        return new Response(
          JSON.stringify({ error: 'userId and keyId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const { data: oldKey, error: fetchError } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !oldKey) {
        return new Response(
          JSON.stringify({ error: 'API key not found or unauthorized' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new API key
      const newApiKey = `sk_mem_${crypto.randomUUID().replace(/-/g, '')}`;

      // Create new key with same settings
      const { data: newKey, error: insertError } = await supabaseAdmin
        .from('api_keys')
        .insert({
          key: newApiKey,
          user_id: userId,
          name: `${oldKey.name} (Rotated)`,
          is_active: true,
          expires_at: oldKey.expires_at,
          rate_limit: oldKey.rate_limit,
          scopes: oldKey.scopes
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating new key:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create new key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deactivate old key
      await supabaseAdmin
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'API key rotated successfully',
          newKey: {
            id: newKey.id,
            key: newApiKey,
            name: newKey.name,
            expiresAt: newKey.expires_at,
            rateLimit: newKey.rate_limit,
            scopes: newKey.scopes
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STATS: Get usage statistics for a key
    if (req.method === 'GET' && action === 'stats') {
      const userId = url.searchParams.get('userId');
      const keyId = url.searchParams.get('keyId');
      
      if (!userId || !keyId) {
        return new Response(
          JSON.stringify({ error: 'userId and keyId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership
      const { data: key, error: keyError } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();

      if (keyError || !key) {
        return new Response(
          JSON.stringify({ error: 'API key not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get last 24h usage
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);

      const { data: usageLogs, error: usageError } = await supabaseAdmin
        .from('api_key_usage')
        .select('*')
        .eq('api_key_id', keyId)
        .gte('timestamp', last24h.toISOString());

      if (usageError) {
        console.error('Error fetching usage logs:', usageError);
      }

      const logs = usageLogs || [];
      const errorCount = logs.filter(log => log.status_code >= 400).length;
      const errorRate = logs.length > 0 ? (errorCount / logs.length * 100).toFixed(2) : '0.00';

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            totalRequests: key.usage_count,
            last24hRequests: logs.length,
            errorRate: `${errorRate}%`,
            lastUsed: key.last_used_at,
            isActive: key.is_active,
            rateLimit: key.rate_limit,
            expiresAt: key.expires_at
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Revoke/delete an API key
    if (req.method === 'DELETE') {
      const userId = url.searchParams.get('userId');
      const keyId = url.searchParams.get('keyId');
      
      if (!userId || !keyId) {
        return new Response(
          JSON.stringify({ error: 'userId and keyId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify ownership before deletion
      const { data: key, error: fetchError } = await supabaseAdmin
        .from('api_keys')
        .select('id')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !key) {
        return new Response(
          JSON.stringify({ error: 'API key not found or unauthorized' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (deleteError) {
        console.error('Error deleting API key:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'API key revoked successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or method' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-api-keys function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});