import { getSql } from './db.ts';

// In-memory rate limit cache (use Redis for production)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

export interface AuthResult {
  apiKeyId: string;
  userId: string;
  apiKey: any;
  error?: string;
  statusCode?: number;
}

/**
 * Authenticate and validate API key with rate limiting
 */
export async function authenticateApiKey(apiKeyHeader: string | null): Promise<AuthResult> {
  const sql = getSql();

  if (!apiKeyHeader) {
    return {
      apiKeyId: '',
      userId: '',
      apiKey: null,
      error: 'API key is required. Please provide an API key in the X-API-Key header',
      statusCode: 401
    };
  }

  // Find API key in database (Neon)
  let keyRecord: any = null;
  try {
    const rows = await sql`SELECT * FROM public.api_keys WHERE key = ${apiKeyHeader} LIMIT 1`;
    keyRecord = rows[0] || null;
  } catch (e) {
    console.error('Error fetching API key:', e);
  }

  if (!keyRecord || !keyRecord.is_active) {
    return {
      apiKeyId: '',
      userId: '',
      apiKey: null,
      error: 'Invalid or inactive API key',
      statusCode: 401
    };
  }

  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return {
      apiKeyId: '',
      userId: '',
      apiKey: null,
      error: 'API key has expired',
      statusCode: 401
    };
  }

  // Rate limiting check
  const rateLimitKey = `ratelimit:${keyRecord.id}`;
  const now = Date.now();
  const rateLimitData = rateLimitCache.get(rateLimitKey);

  if (rateLimitData) {
    if (now < rateLimitData.resetAt) {
      if (rateLimitData.count >= keyRecord.rate_limit) {
        return {
          apiKeyId: keyRecord.id,
          userId: keyRecord.user_id,
          apiKey: keyRecord,
          error: `Rate limit exceeded. Maximum ${keyRecord.rate_limit} requests per hour`,
          statusCode: 429
        };
      }
      rateLimitData.count++;
    } else {
      // Reset window
      rateLimitCache.set(rateLimitKey, {
        count: 1,
        resetAt: now + 60 * 60 * 1000, // 1 hour
      });
    }
  } else {
    rateLimitCache.set(rateLimitKey, {
      count: 1,
      resetAt: now + 60 * 60 * 1000,
    });
  }

  // Update usage stats (fire and forget)
  sql`UPDATE public.api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = ${keyRecord.id}`
    .catch((e: any) => console.error('Error updating usage:', e));

  return {
    apiKeyId: keyRecord.id,
    userId: keyRecord.user_id,
    apiKey: keyRecord
  };
}

/**
 * Log API usage for analytics
 */
export async function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number
) {
  const sql = getSql();

  try {
    await sql`INSERT INTO public.api_key_usage (api_key_id, endpoint, method, status_code) VALUES (${apiKeyId}, ${endpoint}, ${method}, ${statusCode})`;
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: any, requiredScope: string): boolean {
  if (!apiKey || !apiKey.scopes) return false;
  return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('*');
}